import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getCurrentAuthUser } from "../auth/authContext";
import { getDatabaseUrl } from "../config/database";
import { resolveDatabaseFilePath } from "../runtime/appPaths";
import { configureSqliteRuntimePragmas } from "./sqlitePragmas";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function resolveSqliteDatabasePath(databaseUrl: string): string {
  const filePath = databaseUrl.slice("file:".length) || "./dev.db";
  return path.isAbsolute(filePath) ? filePath : resolveDatabaseFilePath(filePath);
}

function resolveSqliteBusyTimeout(timeoutValue?: string): number {
  const parsed = Number(timeoutValue);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  return 15000;
}

const databaseUrl = getDatabaseUrl();
const USER_OWNED_MODELS = new Set([
  "Novel",
  "BaseCharacter",
  "CharacterSyncProposal",
  "ImageGenerationTask",
  "StyleExtractionTask",
  "ImageAsset",
  "World",
  "WorldPropertyLibrary",
  "WritingFormula",
  "StyleProfile",
  "TitleLibrary",
  "APIKey",
  "ModelRouteConfig",
  "CreativeHubThread",
  "KnowledgeDocument",
  "BookAnalysis",
  "TaskCenterArchive",
  "DramaProject",
  "DramaCharacterLibrary",
  "ComicProject",
]);

function getScopedUserId(): string | null {
  const user = getCurrentAuthUser();
  if (!user || user.role === "admin") {
    return null;
  }
  return user.id;
}

function withUserWhere(args: Record<string, unknown>, userId: string): Record<string, unknown> {
  return {
    ...args,
    where: {
      ...((args.where as Record<string, unknown> | undefined) ?? {}),
      userId,
    },
  };
}

function withUserData(args: Record<string, unknown>, userId: string): Record<string, unknown> {
  const data = args.data;
  if (Array.isArray(data)) {
    return {
      ...args,
      data: data.map((item) => ({
        ...(item as Record<string, unknown>),
        userId: (item as Record<string, unknown>).userId ?? userId,
      })),
    };
  }
  return {
    ...args,
    data: {
      ...((data as Record<string, unknown> | undefined) ?? {}),
      userId: ((data as Record<string, unknown> | undefined) ?? {}).userId ?? userId,
    },
  };
}

const adapter = databaseUrl.startsWith("file:")
  ? (() => {
      const timeout = resolveSqliteBusyTimeout(process.env.SQLITE_BUSY_TIMEOUT_MS);
      const sqlitePath = resolveSqliteDatabasePath(databaseUrl);
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
      configureSqliteRuntimePragmas(sqlitePath, {
        busyTimeoutMs: timeout,
      });
      return new PrismaBetterSqlite3({
        url: `file:${sqlitePath}`,
        timeout,
      });
    })()
  : new PrismaPg({
      connectionString: databaseUrl,
    });

const scopedPrisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const userId = model && USER_OWNED_MODELS.has(model) ? getScopedUserId() : null;
          if (!userId || !args || typeof args !== "object") {
            return query(args);
          }
          const mutableArgs = args as Record<string, unknown>;
          if (operation === "findMany" || operation === "findFirst" || operation === "count" || operation === "aggregate" || operation === "groupBy" || operation === "updateMany" || operation === "deleteMany") {
            return query(withUserWhere(mutableArgs, userId));
          }
          if (operation === "create" || operation === "createMany") {
            return query(withUserData(mutableArgs, userId));
          }
          return query(args);
        },
      },
    },
  }) as unknown as PrismaClient;

export const prisma: PrismaClient = global.prisma ?? scopedPrisma;

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
