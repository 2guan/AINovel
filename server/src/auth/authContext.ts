import { AsyncLocalStorage } from "node:async_hooks";

export type AuthRole = "admin" | "writer" | "pending";
export type AuthStatus = "active" | "pending_review" | "disabled";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string | null;
  role: AuthRole;
  status: AuthStatus;
}

interface AuthContext {
  user: AuthUser;
}

const authContext = new AsyncLocalStorage<AuthContext>();

export function runWithAuthUser<T>(user: AuthUser, callback: () => T): T {
  return authContext.run({ user }, callback);
}

export function getCurrentAuthUser(): AuthUser | null {
  return authContext.getStore()?.user ?? null;
}

export function getCurrentUserId(fallbackUserId = "admin"): string {
  return getCurrentAuthUser()?.id ?? fallbackUserId;
}

export function isCurrentUserAdmin(): boolean {
  return getCurrentAuthUser()?.role === "admin";
}
