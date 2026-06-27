import { prisma } from "../../../db/prisma";
import { getCurrentUserId } from "../../../auth/authContext";
import type { SecretStore, SecretStoreListOptions, SecretStoreRecord, SecretStoreWriteInput } from "./SecretStore";

const ADMIN_USER_ID = "admin";

function toPrismaWriteInput(input: SecretStoreWriteInput): Record<string, unknown> {
  return {
    ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
    ...(input.key !== undefined ? { key: input.key } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.baseURL !== undefined ? { baseURL: input.baseURL } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    ...(input.reasoningEnabled !== undefined ? { reasoningEnabled: input.reasoningEnabled } : {}),
    ...(input.concurrencyLimit !== undefined ? { concurrencyLimit: input.concurrencyLimit } : {}),
    ...(input.requestIntervalMs !== undefined ? { requestIntervalMs: input.requestIntervalMs } : {}),
  };
}

export class DatabaseSecretStore implements SecretStore {
  async listProviders(options?: SecretStoreListOptions): Promise<SecretStoreRecord[]> {
    const userId = getCurrentUserId();
    const rows = await prisma.aPIKey.findMany({
      where: {
        userId: userId === ADMIN_USER_ID ? ADMIN_USER_ID : { in: [ADMIN_USER_ID, userId] },
        ...(options?.onlyActive ? { isActive: true } : {}),
        ...(options?.providers?.length
          ? {
            provider: {
              in: options.providers,
            },
          }
          : {}),
      },
      orderBy: [{ userId: "asc" }, { createdAt: "asc" }],
    });
    if (userId === ADMIN_USER_ID) {
      return rows;
    }
    const merged = new Map<string, SecretStoreRecord>();
    for (const row of rows) {
      merged.set(row.provider, row);
    }
    for (const row of rows) {
      if (row.userId === userId) {
        merged.set(row.provider, row);
      }
    }
    return Array.from(merged.values());
  }

  async getProvider(provider: string): Promise<SecretStoreRecord | null> {
    const userId = getCurrentUserId();
    const own = await prisma.aPIKey.findUnique({
      where: { userId_provider: { userId, provider } },
    });
    if (own || userId === ADMIN_USER_ID) {
      return own;
    }
    return prisma.aPIKey.findUnique({
      where: { userId_provider: { userId: ADMIN_USER_ID, provider } },
    });
  }

  async hasProvider(provider: string): Promise<boolean> {
    const existing = await prisma.aPIKey.findUnique({
      where: { userId_provider: { userId: getCurrentUserId(), provider } },
      select: { id: true },
    });
    return existing != null;
  }

  async createProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    return prisma.aPIKey.create({
      data: ({
        userId: getCurrentUserId(),
        provider,
        ...toPrismaWriteInput(input),
      } as Record<string, unknown>) as never,
    });
  }

  async updateProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    return this.upsertProvider(provider, input);
  }

  async upsertProvider(provider: string, input: SecretStoreWriteInput): Promise<SecretStoreRecord> {
    const userId = getCurrentUserId();
    const writeInput = toPrismaWriteInput(input);
    return prisma.aPIKey.upsert({
      where: { userId_provider: { userId, provider } },
      update: writeInput as never,
      create: ({
        userId,
        provider,
        ...writeInput,
      } as Record<string, unknown>) as never,
    });
  }

  async deleteProvider(provider: string): Promise<void> {
    await prisma.aPIKey.delete({
      where: { userId_provider: { userId: getCurrentUserId(), provider } },
    });
  }
}
