import { runWithUserIdContext } from "../../../../auth/runWithUserContext";
import { prisma } from "../../../../db/prisma";

export async function resolveWorkflowTaskOwnerUserId(taskId: string | null | undefined): Promise<string | null> {
  const normalizedTaskId = taskId?.trim();
  if (!normalizedTaskId) {
    return null;
  }

  const rows = await prisma.$queryRaw<Array<{ userId: string | null }>>`
    SELECT "userId"
    FROM "NovelWorkflowTask"
    WHERE "id" = ${normalizedTaskId}
    LIMIT 1
  `;

  return rows[0]?.userId ?? null;
}

export async function runWithWorkflowTaskOwnerContext<T>(
  taskId: string | null | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  const ownerUserId = await resolveWorkflowTaskOwnerUserId(taskId);
  return runWithUserIdContext(ownerUserId, callback);
}
