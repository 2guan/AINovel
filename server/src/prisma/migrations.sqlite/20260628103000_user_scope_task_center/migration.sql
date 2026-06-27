-- Add explicit user ownership to task-center task tables.
-- Existing single-user task records belong to the built-in admin account.

ALTER TABLE "GenerationJob" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "GenerationJob_userId_updatedAt_idx" ON "GenerationJob"("userId", "updatedAt");

ALTER TABLE "AgentRun" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "AgentRun_userId_updatedAt_idx" ON "AgentRun"("userId", "updatedAt");

ALTER TABLE "NovelWorkflowTask" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "NovelWorkflowTask_userId_updatedAt_idx" ON "NovelWorkflowTask"("userId", "updatedAt");

ALTER TABLE "RagIndexJob" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'admin';
CREATE INDEX IF NOT EXISTS "RagIndexJob_userId_updatedAt_idx" ON "RagIndexJob"("userId", "updatedAt");
