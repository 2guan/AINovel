import { isMissingTableError } from "./ragLegacyCompatibility";
import {
  findScopedAppSetting,
  scopedAppSettingUpsert,
} from "./appSettingScope";

export const STYLE_EXTRACTION_TIMEOUT_MS_KEY = "styleEngine.styleExtractionTimeoutMs";

export const DEFAULT_STYLE_EXTRACTION_TIMEOUT_MS = 600_000;
export const MIN_STYLE_EXTRACTION_TIMEOUT_MS = 180_000;
export const MAX_STYLE_EXTRACTION_TIMEOUT_MS = 1_800_000;

export interface StyleEngineRuntimeSettings {
  styleExtractionTimeoutMs: number;
  defaultStyleExtractionTimeoutMs: number;
  minStyleExtractionTimeoutMs: number;
  maxStyleExtractionTimeoutMs: number;
}

export interface StyleEngineRuntimeSettingsInput {
  styleExtractionTimeoutMs: number;
}

function clampInt(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function parseTimeoutMs(
  rawValue: string | null | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  return clampInt(Number(rawValue ?? ""), fallback, min, max);
}

function getDefaultStyleExtractionTimeoutMs(): number {
  const globalTimeoutMs = parseTimeoutMs(
    process.env.LLM_REQUEST_TIMEOUT_MS,
    180_000,
    30_000,
    900_000,
  );
  return parseTimeoutMs(
    process.env.STYLE_EXTRACTION_LLM_TIMEOUT_MS,
    Math.max(globalTimeoutMs, DEFAULT_STYLE_EXTRACTION_TIMEOUT_MS),
    MIN_STYLE_EXTRACTION_TIMEOUT_MS,
    MAX_STYLE_EXTRACTION_TIMEOUT_MS,
  );
}

function buildSettings(styleExtractionTimeoutMs: number): StyleEngineRuntimeSettings {
  return {
    styleExtractionTimeoutMs,
    defaultStyleExtractionTimeoutMs: DEFAULT_STYLE_EXTRACTION_TIMEOUT_MS,
    minStyleExtractionTimeoutMs: MIN_STYLE_EXTRACTION_TIMEOUT_MS,
    maxStyleExtractionTimeoutMs: MAX_STYLE_EXTRACTION_TIMEOUT_MS,
  };
}

export async function getStyleEngineRuntimeSettings(): Promise<StyleEngineRuntimeSettings> {
  const fallback = getDefaultStyleExtractionTimeoutMs();
  try {
    const record = await findScopedAppSetting(STYLE_EXTRACTION_TIMEOUT_MS_KEY);
    return buildSettings(parseTimeoutMs(
      record?.value,
      fallback,
      MIN_STYLE_EXTRACTION_TIMEOUT_MS,
      MAX_STYLE_EXTRACTION_TIMEOUT_MS,
    ));
  } catch (error) {
    if (isMissingTableError(error)) {
      return buildSettings(fallback);
    }
    throw error;
  }
}

export async function saveStyleEngineRuntimeSettings(
  input: StyleEngineRuntimeSettingsInput,
): Promise<StyleEngineRuntimeSettings> {
  const previous = await getStyleEngineRuntimeSettings();
  const settings = buildSettings(clampInt(
    input.styleExtractionTimeoutMs,
    previous.styleExtractionTimeoutMs,
    MIN_STYLE_EXTRACTION_TIMEOUT_MS,
    MAX_STYLE_EXTRACTION_TIMEOUT_MS,
  ));

  try {
    await scopedAppSettingUpsert(STYLE_EXTRACTION_TIMEOUT_MS_KEY, String(settings.styleExtractionTimeoutMs));
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }
  }

  return settings;
}
