import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { runWithAuthUser } from "../auth/authContext";
import { extractBearerToken, resolveSessionUser } from "../auth/session";

function sendAuthError(res: Response, status: number, error: string): void {
  res.status(status).json({
    success: false,
    error,
  } satisfies ApiResponse<null>);
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      sendAuthError(res, 401, "请先登录。");
      return;
    }

    const user = await resolveSessionUser(token);
    if (!user) {
      sendAuthError(res, 401, "登录状态已失效，请重新登录。");
      return;
    }

    req.user = user;
    const isPendingUser = user.role === "pending" || user.status === "pending_review";
    const isAuthEndpoint = req.originalUrl.startsWith("/api/auth/");
    if (isPendingUser && !isAuthEndpoint) {
      sendAuthError(res, 403, "账号正在等待审核。");
      return;
    }

    runWithAuthUser(user, () => next());
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    sendAuthError(res, 403, "需要管理员权限。");
    return;
  }
  next();
}
