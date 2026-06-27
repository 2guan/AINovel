import type { LLMProvider } from "@ai-novel/shared/types/llm";
import { getCurrentAuthUser } from "../auth/authContext";
import { prisma } from "../db/prisma";
import {
  findScopedAppSettings,
  scopedAppSettingUpsert,
} from "../services/settings/appSettingScope";

const STRUCTURED_FALLBACK_ENABLED_KEY = "structuredFallback.enabled";
const STRUCTURED_FALLBACK_PROVIDER_KEY = "structuredFallback.provider";
const STRUCTURED_FALLBACK_MODEL_KEY = "structuredFallback.model";
const STRUCTURED_FALLBACK_TEMPERATURE_KEY = "structuredFallback.temperature";
const STRUCTURED_FALLBACK_MAX_TOKENS_KEY = "structuredFallback.maxTokens";

const DEFAULT_STRUCTURED_FALLBACK_SETTINGS: StructuredFallbackSettings = {
  enabled: false,
  provider: "deepseek",
  model: "deepseek-chat",
  temperature: 0.2,
  maxTokens: null,
};

const cachedSettings = new Map<string, StructuredFallbackSettings>();

export interface StructuredFallbackSettings {
  enabled: boolean;
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number | null;
}

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "P2021"
  );
}

function normalizeProvider(value: string | undefined | null): LLMProvider {
  const trimmed = value?.trim();
  return (trimmed || DEFAULT_STRUCTURED_FALLBACK_SETTINGS.provider) as LLMProvider;
}

function normalizeModel(value: string | undefined | null): string {
  return value?.trim() || DEFAULT_STRUCTURED_FALLBACK_SETTINGS.model;
}

function clampTemperature(value: number | undefined | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_STRUCTURED_FALLBACK_SETTINGS.temperature;
  }
  return Math.min(2, Math.max(0, value));
}

function normalizeMaxTokens(value: number | string | undefined | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return DEFAULT_STRUCTURED_FALLBACK_SETTINGS.maxTokens;
  }
  const normalized = Math.floor(numeric);
  if (normalized < 64) {
    return 64;
  }
  return Math.min(32768, normalized);
}

function buildSettingsFromEntries(entries: Map<string, string>): StructuredFallbackSettings {
  return {
    enabled: entries.get(STRUCTURED_FALLBACK_ENABLED_KEY) === "true",
    provider: normalizeProvider(entries.get(STRUCTURED_FALLBACK_PROVIDER_KEY)),
    model: normalizeModel(entries.get(STRUCTURED_FALLBACK_MODEL_KEY)),
    temperature: clampTemperature(Number(entries.get(STRUCTURED_FALLBACK_TEMPERATURE_KEY))),
    maxTokens: normalizeMaxTokens(entries.get(STRUCTURED_FALLBACK_MAX_TOKENS_KEY)),
  };
}

function getStructuredFallbackCacheKey(): string {
  const user = getCurrentAuthUser();
  if (!user || user.role === "admin") {
    return "admin";
  }
  return user.id;
}

export async function getStructuredFallbackSettings(forceRefresh = false): Promise<StructuredFallbackSettings> {
  const cacheKey = getStructuredFallbackCacheKey();
  const cached = cachedSettings.get(cacheKey);
  if (!forceRefresh && cached) {
    return cached;
  }
  try {
    const valueMap = await findScopedAppSettings([
      STRUCTURED_FALLBACK_ENABLED_KEY,
      STRUCTURED_FALLBACK_PROVIDER_KEY,
      STRUCTURED_FALLBACK_MODEL_KEY,
      STRUCTURED_FALLBACK_TEMPERATURE_KEY,
      STRUCTURED_FALLBACK_MAX_TOKENS_KEY,
    ]);
    const settings = buildSettingsFromEntries(valueMap);
    cachedSettings.set(cacheKey, settings);
    return settings;
  } catch (error) {
    if (isMissingTableError(error)) {
      const settings = { ...DEFAULT_STRUCTURED_FALLBACK_SETTINGS };
      cachedSettings.set(cacheKey, settings);
      return settings;
    }
    throw error;
  }
}

export async function saveStructuredFallbackSettings(input: Partial<StructuredFallbackSettings>): Promise<StructuredFallbackSettings> {
  const previous = await getStructuredFallbackSettings(true);
  const next: StructuredFallbackSettings = {
    enabled: input.enabled ?? previous.enabled,
    provider: normalizeProvider(input.provider ?? previous.provider),
    model: normalizeModel(input.model ?? previous.model),
    temperature: clampTemperature(input.temperature ?? previous.temperature),
    maxTokens: normalizeMaxTokens(input.maxTokens ?? previous.maxTokens),
  };
  try {
    await prisma.$transaction([
      scopedAppSettingUpsert(STRUCTURED_FALLBACK_ENABLED_KEY, String(next.enabled)),
      scopedAppSettingUpsert(STRUCTURED_FALLBACK_PROVIDER_KEY, next.provider),
      scopedAppSettingUpsert(STRUCTURED_FALLBACK_MODEL_KEY, next.model),
      scopedAppSettingUpsert(STRUCTURED_FALLBACK_TEMPERATURE_KEY, String(next.temperature)),
      scopedAppSettingUpsert(STRUCTURED_FALLBACK_MAX_TOKENS_KEY, next.maxTokens == null ? "" : String(next.maxTokens)),
    ]);
    cachedSettings.set(getStructuredFallbackCacheKey(), next);
    return next;
  } catch (error) {
    if (isMissingTableError(error)) {
      cachedSettings.set(getStructuredFallbackCacheKey(), next);
      return next;
    }
    throw error;
  }
}
