import { prisma } from "../db/prisma";
import { runWithAuthUser, type AuthUser } from "./authContext";

export async function runWithUserIdContext<T>(
  userId: string | null | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return callback();
  }
  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      status: true,
    },
  });
  if (!user) {
    return callback();
  }
  return runWithAuthUser({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as AuthUser["role"],
    status: user.status as AuthUser["status"],
  }, callback);
}
