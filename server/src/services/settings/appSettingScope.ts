import { getCurrentAuthUser } from "../../auth/authContext";
import { prisma } from "../../db/prisma";

const ADMIN_USER_ID = "admin";

function getScopedUserId(): string | null {
  const user = getCurrentAuthUser();
  if (!user || user.role === "admin") {
    return null;
  }
  return user.id;
}

export function buildUserScopedAppSettingKey(baseKey: string, userId: string): string {
  return `${baseKey}.user.${userId}`;
}

export function resolveAppSettingWriteKey(baseKey: string): string {
  const userId = getScopedUserId();
  return userId ? buildUserScopedAppSettingKey(baseKey, userId) : baseKey;
}

export function getAppSettingReadKeys(baseKeys: readonly string[]): string[] {
  const userId = getScopedUserId();
  if (!userId) {
    return [...baseKeys];
  }
  return Array.from(new Set([
    ...baseKeys,
    ...baseKeys.map((key) => buildUserScopedAppSettingKey(key, userId)),
  ]));
}

export function mapScopedAppSettingRows(
  baseKeys: readonly string[],
  rows: Array<{ key: string; value: string }>,
): Map<string, string> {
  const userId = getScopedUserId();
  const valueMap = new Map<string, string>();
  const scopedKeyToBase = new Map<string, string>();
  for (const key of baseKeys) {
    scopedKeyToBase.set(key, key);
    if (userId) {
      scopedKeyToBase.set(buildUserScopedAppSettingKey(key, userId), key);
    }
  }
  for (const row of rows) {
    const baseKey = scopedKeyToBase.get(row.key);
    if (!baseKey) {
      continue;
    }
    const isUserScoped = userId ? row.key === buildUserScopedAppSettingKey(baseKey, userId) : false;
    if (isUserScoped || !valueMap.has(baseKey)) {
      valueMap.set(baseKey, row.value);
    }
  }
  return valueMap;
}

export async function findScopedAppSetting(baseKey: string): Promise<{ key: string; value: string } | null> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: getAppSettingReadKeys([baseKey]),
      },
    },
  });
  const valueMap = mapScopedAppSettingRows([baseKey], rows);
  const value = valueMap.get(baseKey);
  return value === undefined ? null : { key: baseKey, value };
}

export async function findScopedAppSettings(baseKeys: readonly string[]): Promise<Map<string, string>> {
  const rows = await prisma.appSetting.findMany({
    where: {
      key: {
        in: getAppSettingReadKeys(baseKeys),
      },
    },
  });
  return mapScopedAppSettingRows(baseKeys, rows);
}

export function scopedAppSettingUpsert(baseKey: string, value: string) {
  const key = resolveAppSettingWriteKey(baseKey);
  return prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export function scopedAppSettingDeleteMany(baseKey: string) {
  return prisma.appSetting.deleteMany({
    where: { key: resolveAppSettingWriteKey(baseKey) },
  });
}

export function getAdminDefaultAppSettingKey(baseKey: string): string {
  return baseKey;
}

export function getAdminUserId(): string {
  return ADMIN_USER_ID;
}
