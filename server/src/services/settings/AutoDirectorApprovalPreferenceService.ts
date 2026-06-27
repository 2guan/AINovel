import {
  DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES,
  DIRECTOR_AUTO_APPROVAL_GROUPS,
  DIRECTOR_AUTO_APPROVAL_POINTS,
  normalizeDirectorAutoApprovalPointCodes,
  type DirectorAutoApprovalPreferenceSettings,
} from "@ai-novel/shared/types/autoDirectorApproval";
import {
  findScopedAppSettings,
  scopedAppSettingUpsert,
} from "./appSettingScope";

const APPROVAL_POINT_CODES_KEY = "autoDirector.approvalPreference.approvalPointCodes";
const ALL_KEYS = [APPROVAL_POINT_CODES_KEY] as const;

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "P2021"
  );
}

function isDbUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = "code" in error ? (error as { code?: string }).code : undefined;
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return code === "P1001" || /can't reach database server/i.test(message);
}

function parsePointCodes(value: string | null | undefined, hasStoredValue: boolean) {
  if (value == null) {
    return [...DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES];
  }
  if (!value.trim()) {
    return hasStoredValue ? [] : [...DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES];
  }
  return normalizeDirectorAutoApprovalPointCodes(value.split(",").map((item) => item.trim()));
}

function stringifyPointCodes(values: readonly string[] | undefined): string {
  return normalizeDirectorAutoApprovalPointCodes(values).join(",");
}

function buildSettings(approvalPointCodes: readonly string[] | null | undefined): DirectorAutoApprovalPreferenceSettings {
  return {
    approvalPointCodes: normalizeDirectorAutoApprovalPointCodes(approvalPointCodes),
    approvalPoints: DIRECTOR_AUTO_APPROVAL_POINTS.map((item) => ({ ...item })),
    groups: DIRECTOR_AUTO_APPROVAL_GROUPS.map((item) => ({ ...item })),
  };
}

export async function getAutoDirectorApprovalPreferenceSettings(): Promise<DirectorAutoApprovalPreferenceSettings> {
  try {
    const valueMap = await findScopedAppSettings(ALL_KEYS);
    const value = valueMap.get(APPROVAL_POINT_CODES_KEY);
    return buildSettings(parsePointCodes(value, value !== undefined));
  } catch (error) {
    if (isMissingTableError(error) || isDbUnavailableError(error)) {
      return buildSettings(DEFAULT_DIRECTOR_AUTO_APPROVAL_POINT_CODES);
    }
    throw error;
  }
}

export async function saveAutoDirectorApprovalPreferenceSettings(input: {
  approvalPointCodes: string[];
}): Promise<DirectorAutoApprovalPreferenceSettings> {
  const nextCodes = normalizeDirectorAutoApprovalPointCodes(input.approvalPointCodes, []);
  try {
    await scopedAppSettingUpsert(APPROVAL_POINT_CODES_KEY, stringifyPointCodes(nextCodes));
  } catch (error) {
    if (isMissingTableError(error) || isDbUnavailableError(error)) {
      return buildSettings(nextCodes);
    }
    throw error;
  }
  return buildSettings(nextCodes);
}
