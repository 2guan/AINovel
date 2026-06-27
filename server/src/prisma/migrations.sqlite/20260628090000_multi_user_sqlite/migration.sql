-- Multi-user support for the SQLite runtime.
-- Existing single-user data is assigned to the built-in admin account.

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "username" TEXT NOT NULL,
  "displayName" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'pending',
  "status" TEXT NOT NULL DEFAULT 'pending_review',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

CREATE TABLE IF NOT EXISTS "UserSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX IF NOT EXISTS "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");

INSERT OR IGNORE INTO "User" (
  "id",
  "username",
  "displayName",
  "passwordHash",
  "role",
  "status",
  "createdAt",
  "updatedAt"
) VALUES (
  'admin',
  'admin',
  '系统管理员',
  'pbkdf2_sha256$310000$54735d89a9a0b5ce4bd4bbbda0c34a8b$895a8d12c51497023bf8a509e0cd459850c85cb32a3140479a18ccd7b36315b2',
  'admin',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

ALTER TABLE "Novel" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "Novel_userId_updatedAt_idx" ON "Novel"("userId", "updatedAt");

ALTER TABLE "BaseCharacter" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "BaseCharacter_userId_updatedAt_idx" ON "BaseCharacter"("userId", "updatedAt");

ALTER TABLE "CharacterSyncProposal" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "CharacterSyncProposal_userId_status_updatedAt_idx" ON "CharacterSyncProposal"("userId", "status", "updatedAt");

ALTER TABLE "ImageGenerationTask" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "ImageGenerationTask_userId_createdAt_idx" ON "ImageGenerationTask"("userId", "createdAt");

ALTER TABLE "StyleExtractionTask" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "StyleExtractionTask_userId_updatedAt_idx" ON "StyleExtractionTask"("userId", "updatedAt");

ALTER TABLE "ImageAsset" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "ImageAsset_userId_createdAt_idx" ON "ImageAsset"("userId", "createdAt");

ALTER TABLE "World" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "World_userId_updatedAt_idx" ON "World"("userId", "updatedAt");

ALTER TABLE "WorldPropertyLibrary" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "WorldPropertyLibrary_userId_updatedAt_idx" ON "WorldPropertyLibrary"("userId", "updatedAt");

ALTER TABLE "WritingFormula" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "WritingFormula_userId_updatedAt_idx" ON "WritingFormula"("userId", "updatedAt");

ALTER TABLE "StyleProfile" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "StyleProfile_userId_updatedAt_idx" ON "StyleProfile"("userId", "updatedAt");

ALTER TABLE "TitleLibrary" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "TitleLibrary_userId_updatedAt_idx" ON "TitleLibrary"("userId", "updatedAt");

ALTER TABLE "APIKey" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
DROP INDEX IF EXISTS "APIKey_provider_key";
CREATE UNIQUE INDEX IF NOT EXISTS "APIKey_userId_provider_key" ON "APIKey"("userId", "provider");
CREATE INDEX IF NOT EXISTS "APIKey_provider_idx" ON "APIKey"("provider");

ALTER TABLE "ModelRouteConfig" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
DROP INDEX IF EXISTS "ModelRouteConfig_taskType_key";
CREATE UNIQUE INDEX IF NOT EXISTS "ModelRouteConfig_userId_taskType_key" ON "ModelRouteConfig"("userId", "taskType");
CREATE INDEX IF NOT EXISTS "ModelRouteConfig_userId_idx" ON "ModelRouteConfig"("userId");

ALTER TABLE "CreativeHubThread" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "CreativeHubThread_userId_updatedAt_idx" ON "CreativeHubThread"("userId", "updatedAt");

ALTER TABLE "KnowledgeDocument" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "KnowledgeDocument_userId_updatedAt_idx" ON "KnowledgeDocument"("userId", "updatedAt");

ALTER TABLE "BookAnalysis" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "BookAnalysis_userId_updatedAt_idx" ON "BookAnalysis"("userId", "updatedAt");

ALTER TABLE "TaskCenterArchive" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
DROP INDEX IF EXISTS "TaskCenterArchive_taskKind_taskId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "TaskCenterArchive_userId_taskKind_taskId_key" ON "TaskCenterArchive"("userId", "taskKind", "taskId");
CREATE INDEX IF NOT EXISTS "TaskCenterArchive_userId_archivedAt_idx" ON "TaskCenterArchive"("userId", "archivedAt");

ALTER TABLE "DramaProject" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "DramaProject_userId_updatedAt_idx" ON "DramaProject"("userId", "updatedAt");

ALTER TABLE "DramaCharacterLibrary" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "DramaCharacterLibrary_userId_updatedAt_idx" ON "DramaCharacterLibrary"("userId", "updatedAt");

ALTER TABLE "ComicProject" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "ComicProject_userId_updatedAt_idx" ON "ComicProject"("userId", "updatedAt");
