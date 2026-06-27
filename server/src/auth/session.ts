import crypto from "node:crypto";
import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "./password";
import type { AuthUser } from "./authContext";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INITIAL_ADMIN_ID = "admin";
const INITIAL_ADMIN_USERNAME = "admin";
const INITIAL_ADMIN_PASSWORD = "admin2026";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
  status: string;
}): AuthUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role as AuthUser["role"],
    status: user.status as AuthUser["status"],
  };
}

export async function ensureInitialAdminUser(): Promise<void> {
  await prisma.user.upsert({
    where: { username: INITIAL_ADMIN_USERNAME },
    update: {
      role: "admin",
      status: "active",
    },
    create: {
      id: INITIAL_ADMIN_ID,
      username: INITIAL_ADMIN_USERNAME,
      displayName: "系统管理员",
      passwordHash: hashPassword(INITIAL_ADMIN_PASSWORD),
      role: "admin",
      status: "active",
    },
  });
}

export async function registerPendingUser(input: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<AuthUser> {
  const user = await prisma.user.create({
    data: {
      username: input.username,
      displayName: input.displayName?.trim() || null,
      passwordHash: hashPassword(input.password),
      role: "pending",
      status: "pending_review",
    },
  });
  return toAuthUser(user);
}

export async function createSessionForLogin(input: {
  username: string;
  password: string;
}): Promise<{ token: string; user: AuthUser; expiresAt: Date }> {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("用户名或密码不正确。");
  }
  if (user.status === "disabled") {
    throw new Error("这个账号已停用。");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.userSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return { token, user: toAuthUser(user), expiresAt };
}

export async function resolveSessionUser(token: string): Promise<AuthUser | null> {
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.userSession.delete({ where: { id: session.id } }).catch(() => null);
    }
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user || user.status === "disabled") {
    return null;
  }
  return toAuthUser(user);
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.userSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
}): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
    throw new Error("当前密码不正确。");
  }
  await prisma.user.update({
    where: { id: input.userId },
    data: { passwordHash: hashPassword(input.nextPassword) },
  });
  await prisma.userSession.deleteMany({
    where: { userId: input.userId },
  });
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
