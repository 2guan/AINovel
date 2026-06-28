-- Backfill SQLite tables that already exist in the Prisma schema but were
-- missing from the SQLite migration history.

CREATE TABLE IF NOT EXISTS "PromptSlotOverride" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "scope" TEXT NOT NULL,
  "novelId" TEXT,
  "promptId" TEXT NOT NULL,
  "baseVersion" TEXT NOT NULL,
  "slots" TEXT NOT NULL DEFAULT '{}',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "PromptSlotOverride_novelId_fkey"
    FOREIGN KEY ("novelId") REFERENCES "Novel" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromptSlotOverride_scope_novelId_promptId_key"
  ON "PromptSlotOverride"("scope", "novelId", "promptId");
CREATE INDEX IF NOT EXISTS "PromptSlotOverride_promptId_idx"
  ON "PromptSlotOverride"("promptId");
CREATE INDEX IF NOT EXISTS "PromptSlotOverride_novelId_promptId_idx"
  ON "PromptSlotOverride"("novelId", "promptId");

CREATE TABLE IF NOT EXISTS "NovelFactEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "novelId" TEXT NOT NULL,
  "chapterOrder" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'completed',
  "source" TEXT NOT NULL DEFAULT 'auto',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NovelFactEntry_novelId_fkey"
    FOREIGN KEY ("novelId") REFERENCES "Novel" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NovelFactEntry_novelId_chapterOrder_idx"
  ON "NovelFactEntry"("novelId", "chapterOrder");
CREATE INDEX IF NOT EXISTS "NovelFactEntry_novelId_category_idx"
  ON "NovelFactEntry"("novelId", "category");
