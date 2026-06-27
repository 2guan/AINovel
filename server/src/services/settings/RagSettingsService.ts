import { prisma } from "../../db/prisma";
import { ragConfig, asEmbeddingProvider, type EmbeddingProvider } from "../../config/rag";
import {
  getProviderEnvApiKey,
  isBuiltInProvider,
  providerRequiresApiKey,
  PROVIDERS,
  SUPPORTED_PROVIDERS,
} from "../../llm/providers";
import {
  getLegacyProviderEmbeddingModelEnv,
  isMissingTableError,
  normalizeOptionalText,
  shouldPreserveLegacyQdrantCollection,
} from "./ragLegacyCompatibility";
import {
  DEFAULT_RAG_COLLECTION_NAME,
  RAG_EMBEDDING_AUTO_REINDEX_KEY,
  RAG_EMBEDDING_BATCH_SIZE_KEY,
  RAG_EMBEDDING_COLLECTION_MODE_KEY,
  RAG_EMBEDDING_COLLECTION_NAME_KEY,
  RAG_EMBEDDING_COLLECTION_TAG_KEY,
  RAG_EMBEDDING_MAX_RETRIES_KEY,
  RAG_EMBEDDING_MODEL_KEY,
  RAG_EMBEDDING_PROVIDER_KEY,
  RAG_EMBEDDING_RETRY_BASE_MS_KEY,
  RAG_EMBEDDING_SETTING_KEYS,
  RAG_EMBEDDING_TIMEOUT_MS_KEY,
} from "./ragSettingKeys";
import {
  findScopedAppSettings,
  scopedAppSettingUpsert,
} from "./appSettingScope";
import { secretStore } from "./secretStore";

export type RagEmbeddingCollectionMode = "auto" | "manual";

export interface RagEmbeddingSettings {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  collectionVersion: number;
  collectionMode: RagEmbeddingCollectionMode;
  collectionName: string;
  collectionTag: string;
  autoReindexOnChange: boolean;
  embeddingBatchSize: number;
  embeddingTimeoutMs: number;
  embeddingMaxRetries: number;
  embeddingRetryBaseMs: number;
  suggestedCollectionName: string;
}

export interface RagEmbeddingSettingsInput {
  embeddingProvider: EmbeddingProvider;
  embeddingModel: string;
  collectionMode: RagEmbeddingCollectionMode;
  collectionName: string;
  collectionTag: string;
  autoReindexOnChange: boolean;
  embeddingBatchSize: number;
  embeddingTimeoutMs: number;
  embeddingMaxRetries: number;
  embeddingRetryBaseMs: number;
}

export interface RagEmbeddingProviderStatus {
  provider: EmbeddingProvider;
  name: string;
  isConfigured: boolean;
  isActive: boolean;
}

export interface SaveRagEmbeddingSettingsResult {
  settings: RagEmbeddingSettings;
  collectionChanged: boolean;
  modelChanged: boolean;
  providerChanged: boolean;
  shouldReindex: boolean;
}

function normalizeEmbeddingModel(value: string | undefined, provider: EmbeddingProvider = ragConfig.embeddingProvider): string {
  const normalized = value?.trim();
  if (normalized && normalized.length > 0) {
    return normalized;
  }
  return getLegacyProviderEmbeddingModelEnv(provider) ?? ragConfig.embeddingModel;
}

function normalizeCollectionMode(value: string | undefined, fallback: RagEmbeddingCollectionMode): RagEmbeddingCollectionMode {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "manual") {
    return "manual";
  }
  if (normalized === "auto") {
    return "auto";
  }
  return fallback;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(normalized);
}

function clampInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function slugifySegment(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function normalizeCollectionTag(value: string | undefined): string {
  return slugifySegment(value ?? "kb", "kb").slice(0, 32);
}

function normalizeCollectionName(value: string | undefined, fallback: string): string {
  return slugifySegment(value ?? fallback, slugifySegment(fallback, DEFAULT_RAG_COLLECTION_NAME)).slice(0, 120);
}

function uniqueProviders(providers: string[]): EmbeddingProvider[] {
  return Array.from(new Set(providers.map((item) => item.trim()).filter(Boolean))) as EmbeddingProvider[];
}

function getProviderDisplayName(provider: EmbeddingProvider, displayName?: string | null): string {
  if (isBuiltInProvider(provider)) {
    return PROVIDERS[provider].name;
  }
  return normalizeOptionalText(displayName ?? undefined) ?? provider;
}

function buildAutoCollectionName(
  provider: EmbeddingProvider,
  model: string,
  tag: string,
): string {
  const name = [
    "ai",
    "novel",
    "rag",
    provider,
    slugifySegment(model, "embedding"),
    tag,
    `v${ragConfig.embeddingVersion}`,
  ].join("_");
  return normalizeCollectionName(name, DEFAULT_RAG_COLLECTION_NAME);
}

function applyRagRuntimeSettings(settings: RagEmbeddingSettings): RagEmbeddingSettings {
  ragConfig.embeddingProvider = settings.embeddingProvider;
  ragConfig.embeddingModel = settings.embeddingModel;
  ragConfig.embeddingBatchSize = settings.embeddingBatchSize;
  ragConfig.embeddingTimeoutMs = settings.embeddingTimeoutMs;
  ragConfig.embeddingMaxRetries = settings.embeddingMaxRetries;
  ragConfig.embeddingRetryBaseMs = settings.embeddingRetryBaseMs;
  ragConfig.qdrantCollection = settings.collectionName;
  return settings;
}

async function getDefaultSettings(): Promise<RagEmbeddingSettings> {
  const collectionTag = normalizeCollectionTag("kb");
  const suggestedCollectionName = buildAutoCollectionName(
    ragConfig.embeddingProvider,
    normalizeEmbeddingModel(ragConfig.embeddingModel, ragConfig.embeddingProvider),
    collectionTag,
  );
  const shouldPreserveLegacyCollection = await shouldPreserveLegacyQdrantCollection();
  return {
    embeddingProvider: ragConfig.embeddingProvider,
    embeddingModel: normalizeEmbeddingModel(ragConfig.embeddingModel, ragConfig.embeddingProvider),
    collectionVersion: ragConfig.embeddingVersion,
    collectionMode: shouldPreserveLegacyCollection || ragConfig.qdrantCollection !== DEFAULT_RAG_COLLECTION_NAME
      ? "manual"
      : "auto",
    collectionName: normalizeCollectionName(ragConfig.qdrantCollection, DEFAULT_RAG_COLLECTION_NAME),
    collectionTag,
    autoReindexOnChange: true,
    embeddingBatchSize: clampInt(ragConfig.embeddingBatchSize, 64, 1, 256),
    embeddingTimeoutMs: clampInt(ragConfig.embeddingTimeoutMs, 30000, 5000, 300000),
    embeddingMaxRetries: clampInt(ragConfig.embeddingMaxRetries, 2, 0, 8),
    embeddingRetryBaseMs: clampInt(ragConfig.embeddingRetryBaseMs, 500, 100, 10000),
    suggestedCollectionName,
  };
}

export async function getRagEmbeddingSettings(): Promise<RagEmbeddingSettings> {
  try {
    const valueMap = await findScopedAppSettings(RAG_EMBEDDING_SETTING_KEYS);
    const defaults = await getDefaultSettings();
    const embeddingProvider = asEmbeddingProvider(valueMap.get(RAG_EMBEDDING_PROVIDER_KEY) ?? defaults.embeddingProvider);
    const embeddingModel = normalizeEmbeddingModel(
      valueMap.get(RAG_EMBEDDING_MODEL_KEY) ?? defaults.embeddingModel,
      embeddingProvider,
    );
    const collectionMode = normalizeCollectionMode(
      valueMap.get(RAG_EMBEDDING_COLLECTION_MODE_KEY),
      defaults.collectionMode,
    );
    const collectionTag = normalizeCollectionTag(valueMap.get(RAG_EMBEDDING_COLLECTION_TAG_KEY) ?? defaults.collectionTag);
    const suggestedCollectionName = buildAutoCollectionName(embeddingProvider, embeddingModel, collectionTag);
    const collectionName = normalizeCollectionName(
      valueMap.get(RAG_EMBEDDING_COLLECTION_NAME_KEY)
        ?? (collectionMode === "auto" ? suggestedCollectionName : defaults.collectionName),
      defaults.collectionName,
    );
    return applyRagRuntimeSettings({
      embeddingProvider,
      embeddingModel,
      collectionVersion: ragConfig.embeddingVersion,
      collectionMode,
      collectionName,
      collectionTag,
      autoReindexOnChange: toBoolean(valueMap.get(RAG_EMBEDDING_AUTO_REINDEX_KEY), defaults.autoReindexOnChange),
      embeddingBatchSize: clampInt(
        Number(valueMap.get(RAG_EMBEDDING_BATCH_SIZE_KEY)),
        defaults.embeddingBatchSize,
        1,
        256,
      ),
      embeddingTimeoutMs: clampInt(
        Number(valueMap.get(RAG_EMBEDDING_TIMEOUT_MS_KEY)),
        defaults.embeddingTimeoutMs,
        5000,
        300000,
      ),
      embeddingMaxRetries: clampInt(
        Number(valueMap.get(RAG_EMBEDDING_MAX_RETRIES_KEY)),
        defaults.embeddingMaxRetries,
        0,
        8,
      ),
      embeddingRetryBaseMs: clampInt(
        Number(valueMap.get(RAG_EMBEDDING_RETRY_BASE_MS_KEY)),
        defaults.embeddingRetryBaseMs,
        100,
        10000,
      ),
      suggestedCollectionName,
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return applyRagRuntimeSettings(await getDefaultSettings());
    }
    throw error;
  }
}

export async function saveRagEmbeddingSettings(input: RagEmbeddingSettingsInput): Promise<SaveRagEmbeddingSettingsResult> {
  const previous = await getRagEmbeddingSettings();
  const embeddingProvider = asEmbeddingProvider(input.embeddingProvider);
  const embeddingModel = normalizeEmbeddingModel(input.embeddingModel, embeddingProvider);
  const collectionMode = normalizeCollectionMode(input.collectionMode, previous.collectionMode);
  const collectionTag = normalizeCollectionTag(input.collectionTag || previous.collectionTag);
  const suggestedCollectionName = buildAutoCollectionName(embeddingProvider, embeddingModel, collectionTag);
  const collectionName = collectionMode === "auto"
    ? suggestedCollectionName
    : normalizeCollectionName(input.collectionName, previous.collectionName);
  const settings = applyRagRuntimeSettings({
    embeddingProvider,
    embeddingModel,
    collectionVersion: ragConfig.embeddingVersion,
    collectionMode,
    collectionName,
    collectionTag,
    autoReindexOnChange: Boolean(input.autoReindexOnChange),
    embeddingBatchSize: clampInt(input.embeddingBatchSize, previous.embeddingBatchSize, 1, 256),
    embeddingTimeoutMs: clampInt(input.embeddingTimeoutMs, previous.embeddingTimeoutMs, 5000, 300000),
    embeddingMaxRetries: clampInt(input.embeddingMaxRetries, previous.embeddingMaxRetries, 0, 8),
    embeddingRetryBaseMs: clampInt(input.embeddingRetryBaseMs, previous.embeddingRetryBaseMs, 100, 10000),
    suggestedCollectionName,
  });

  const providerChanged = previous.embeddingProvider !== settings.embeddingProvider;
  const modelChanged = previous.embeddingModel !== settings.embeddingModel;
  const collectionChanged = previous.collectionName !== settings.collectionName;

  const data = {
    embeddingProvider: settings.embeddingProvider,
    embeddingModel: settings.embeddingModel,
    collectionVersion: settings.collectionVersion,
    collectionMode: settings.collectionMode,
    collectionName: settings.collectionName,
    collectionTag: settings.collectionTag,
    autoReindexOnChange: settings.autoReindexOnChange,
    embeddingBatchSize: settings.embeddingBatchSize,
    embeddingTimeoutMs: settings.embeddingTimeoutMs,
    embeddingMaxRetries: settings.embeddingMaxRetries,
    embeddingRetryBaseMs: settings.embeddingRetryBaseMs,
    suggestedCollectionName: settings.suggestedCollectionName,
  };
  try {
    await prisma.$transaction([
      scopedAppSettingUpsert(RAG_EMBEDDING_PROVIDER_KEY, data.embeddingProvider),
      scopedAppSettingUpsert(RAG_EMBEDDING_MODEL_KEY, data.embeddingModel),
      scopedAppSettingUpsert(RAG_EMBEDDING_COLLECTION_MODE_KEY, data.collectionMode),
      scopedAppSettingUpsert(RAG_EMBEDDING_COLLECTION_NAME_KEY, data.collectionName),
      scopedAppSettingUpsert(RAG_EMBEDDING_COLLECTION_TAG_KEY, data.collectionTag),
      scopedAppSettingUpsert(RAG_EMBEDDING_AUTO_REINDEX_KEY, String(data.autoReindexOnChange)),
      scopedAppSettingUpsert(RAG_EMBEDDING_BATCH_SIZE_KEY, String(data.embeddingBatchSize)),
      scopedAppSettingUpsert(RAG_EMBEDDING_TIMEOUT_MS_KEY, String(data.embeddingTimeoutMs)),
      scopedAppSettingUpsert(RAG_EMBEDDING_MAX_RETRIES_KEY, String(data.embeddingMaxRetries)),
      scopedAppSettingUpsert(RAG_EMBEDDING_RETRY_BASE_MS_KEY, String(data.embeddingRetryBaseMs)),
    ]);
    return {
      settings,
      collectionChanged,
      modelChanged,
      providerChanged,
      shouldReindex: providerChanged || modelChanged || collectionChanged,
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        settings,
        collectionChanged,
        modelChanged,
        providerChanged,
        shouldReindex: providerChanged || modelChanged || collectionChanged,
      };
    }
    throw error;
  }
}

export async function getRagEmbeddingProviders(): Promise<RagEmbeddingProviderStatus[]> {
  const builtInProviders = [...SUPPORTED_PROVIDERS];
  try {
    const items = await secretStore.listProviders();
    const itemMap = new Map(items.map((item) => [item.provider, item]));
    const providers = uniqueProviders([
      ...builtInProviders,
      ...items
        .filter((item) => !isBuiltInProvider(item.provider))
        .map((item) => item.provider),
    ]);
    return providers.map((provider) => {
      const item = itemMap.get(provider);
      const envApiKey = isBuiltInProvider(provider)
        ? normalizeOptionalText(getProviderEnvApiKey(provider))
        : undefined;
      const configuredSecret = normalizeOptionalText(item?.key ?? undefined) ?? envApiKey;
      const configuredBaseUrl = normalizeOptionalText(item?.baseURL ?? undefined);
      const canRunWithoutApiKey = !isBuiltInProvider(provider) || !providerRequiresApiKey(provider);
      return {
        provider,
        name: getProviderDisplayName(provider, item?.displayName),
        isConfigured: Boolean(configuredSecret) || (canRunWithoutApiKey && Boolean(configuredBaseUrl || isBuiltInProvider(provider))),
        isActive: item?.isActive ?? (Boolean(envApiKey) || canRunWithoutApiKey),
      };
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      return builtInProviders.map((provider) => {
        const envApiKey = normalizeOptionalText(getProviderEnvApiKey(provider));
        const canRunWithoutApiKey = !providerRequiresApiKey(provider);
        return {
          provider,
          name: PROVIDERS[provider].name,
          isConfigured: Boolean(envApiKey) || canRunWithoutApiKey,
          isActive: Boolean(envApiKey) || canRunWithoutApiKey,
        };
      });
    }
    throw error;
  }
}
