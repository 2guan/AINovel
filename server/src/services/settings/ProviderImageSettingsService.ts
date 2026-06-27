import type { LLMProvider } from "@ai-novel/shared/types/llm";
import {
  findScopedAppSetting,
  findScopedAppSettings,
  scopedAppSettingDeleteMany,
  scopedAppSettingUpsert,
} from "./appSettingScope";

export type ImageModelProvider = "openai" | "siliconflow" | "grok";

const IMAGE_MODEL_SETTING_PREFIX = "provider.imageModel";

const IMAGE_MODEL_OPTIONS: Record<ImageModelProvider, string[]> = {
  openai: ["gpt-image-2"],
  siliconflow: ["black-forest-labs/FLUX.1-schnell"],
  grok: ["grok-imagine-image"],
};

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "P2021"
  );
}

function normalizeOptionalText(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function supportsImageModelSettings(provider: LLMProvider): boolean {
  return typeof provider === "string" && provider.trim().length > 0;
}

function isKnownImageModelProvider(provider: LLMProvider): provider is ImageModelProvider {
  return provider === "openai" || provider === "siliconflow" || provider === "grok";
}

export function getImageModelSettingKey(provider: LLMProvider): string | null {
  if (!supportsImageModelSettings(provider)) {
    return null;
  }
  return `${IMAGE_MODEL_SETTING_PREFIX}.${provider}`;
}

export function getImageModelOptions(provider: LLMProvider): string[] {
  if (!isKnownImageModelProvider(provider)) {
    return [];
  }
  return [...IMAGE_MODEL_OPTIONS[provider]];
}

export function getDefaultImageModel(provider: LLMProvider): string | undefined {
  return getImageModelOptions(provider)[0];
}

export function getProviderEnvImageModel(provider: LLMProvider): string | undefined {
  switch (provider) {
    case "openai":
      return normalizeOptionalText(process.env.OPENAI_IMAGE_MODEL);
    case "siliconflow":
      return normalizeOptionalText(process.env.SILICONFLOW_IMAGE_MODEL);
    case "grok":
      return normalizeOptionalText(process.env.XAI_IMAGE_MODEL);
    default:
      return undefined;
  }
}

export async function getProviderImageModel(provider: LLMProvider): Promise<string | undefined> {
  if (!supportsImageModelSettings(provider)) {
    return undefined;
  }
  const key = getImageModelSettingKey(provider);
  if (!key) {
    return undefined;
  }

  try {
    const record = await findScopedAppSetting(key);
    return normalizeOptionalText(record?.value)
      ?? getProviderEnvImageModel(provider)
      ?? getDefaultImageModel(provider);
  } catch (error) {
    if (isMissingTableError(error)) {
      return getProviderEnvImageModel(provider) ?? getDefaultImageModel(provider);
    }
    throw error;
  }
}

export async function getProviderImageModelMap(
  providers: LLMProvider[],
): Promise<Map<LLMProvider, string | undefined>> {
  const supportedProviders = Array.from(new Set(providers.filter((provider) => supportsImageModelSettings(provider))));
  const result = new Map<LLMProvider, string | undefined>();
  for (const provider of providers) {
    result.set(provider, getProviderEnvImageModel(provider) ?? getDefaultImageModel(provider));
  }
  if (supportedProviders.length === 0) {
    return result;
  }

  const keys = supportedProviders
    .map((provider) => getImageModelSettingKey(provider))
    .filter((value): value is string => Boolean(value));

  try {
    const valueMap = await findScopedAppSettings(keys);
    for (const provider of supportedProviders) {
      const key = getImageModelSettingKey(provider);
      if (!key) {
        continue;
      }
      result.set(
        provider,
          normalizeOptionalText(valueMap.get(key))
          ?? getProviderEnvImageModel(provider)
          ?? getDefaultImageModel(provider),
      );
    }
    return result;
  } catch (error) {
    if (isMissingTableError(error)) {
      return result;
    }
    throw error;
  }
}

export async function saveProviderImageModel(
  provider: LLMProvider,
  imageModel: string | null | undefined,
): Promise<string | undefined> {
  if (!supportsImageModelSettings(provider)) {
    return undefined;
  }
  const key = getImageModelSettingKey(provider);
  if (!key) {
    return undefined;
  }

  const normalized = normalizeOptionalText(imageModel);

  try {
    if (!normalized) {
      await scopedAppSettingDeleteMany(key);
      return getProviderEnvImageModel(provider) ?? getDefaultImageModel(provider);
    }

    await scopedAppSettingUpsert(key, normalized);
    return normalized;
  } catch (error) {
    if (isMissingTableError(error)) {
      return normalized ?? getProviderEnvImageModel(provider) ?? getDefaultImageModel(provider);
    }
    throw error;
  }
}
