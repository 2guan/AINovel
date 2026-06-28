import { prisma } from "../db/prisma";
import { runWithUserIdContext } from "./runWithUserContext";

type OwnerRow = { userId: string | null };

function normalizeId(id: string | null | undefined): string | null {
  const normalized = id?.trim();
  return normalized || null;
}

function firstUserId(rows: OwnerRow[]): string | null {
  return rows[0]?.userId ?? null;
}

export async function resolveNovelOwnerUserId(novelId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(novelId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "Novel" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveWorkflowTaskOwnerUserId(taskId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(taskId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "NovelWorkflowTask" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveGenerationJobOwnerUserId(jobId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(jobId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "GenerationJob" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveImageGenerationTaskOwnerUserId(taskId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(taskId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "ImageGenerationTask" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveStyleExtractionTaskOwnerUserId(taskId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(taskId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "StyleExtractionTask" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveBookAnalysisOwnerUserId(analysisId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(analysisId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT "userId" FROM "BookAnalysis" WHERE "id" = ${id} LIMIT 1
  `);
}

export async function resolveDramaBatchJobOwnerUserId(jobId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(jobId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT p."userId"
    FROM "DramaBatchJob" b
    JOIN "DramaProject" p ON p."id" = b."projectId"
    WHERE b."id" = ${id}
    LIMIT 1
  `);
}

export async function resolveComicBatchJobOwnerUserId(jobId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(jobId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT p."userId"
    FROM "ComicBatchJob" b
    JOIN "ComicProject" p ON p."id" = b."projectId"
    WHERE b."id" = ${id}
    LIMIT 1
  `);
}

export async function resolveComicEpisodeOwnerUserId(episodeId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(episodeId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT p."userId"
    FROM "ComicEpisode" e
    JOIN "ComicProject" p ON p."id" = e."projectId"
    WHERE e."id" = ${id}
    LIMIT 1
  `);
}

export async function resolveNovelSideEffectJobOwnerUserId(jobId: string | null | undefined): Promise<string | null> {
  const id = normalizeId(jobId);
  if (!id) return null;
  return firstUserId(await prisma.$queryRaw<OwnerRow[]>`
    SELECT n."userId"
    FROM "NovelSideEffectJob" j
    JOIN "Novel" n ON n."id" = j."novelId"
    WHERE j."id" = ${id}
    LIMIT 1
  `);
}

export async function runWithNovelOwnerContext<T>(
  novelId: string | null | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  return runWithUserIdContext(await resolveNovelOwnerUserId(novelId), callback);
}

export async function runWithWorkflowTaskOwnerContext<T>(
  taskId: string | null | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  return runWithUserIdContext(await resolveWorkflowTaskOwnerUserId(taskId), callback);
}

export async function runWithComicEpisodeOwnerContext<T>(
  episodeId: string | null | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  return runWithUserIdContext(await resolveComicEpisodeOwnerUserId(episodeId), callback);
}
