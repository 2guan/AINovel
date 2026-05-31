import type { NextFunction, Request, Response } from "express";
import { verifyToken, JWTPayload } from "../utils/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const publicPaths = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/health", // Keep health check public
  ];

  const path = req.path;
  // If request is to public paths, pass next immediately
  if (publicPaths.some(p => path.startsWith(p))) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "未登录或登录已过期，请重新登录。" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ success: false, message: "无效的认证令牌，请重新登录。" });
    return;
  }

  req.user = decoded;

  // Intercept pending approval users for all non-auth endpoints
  // "/api/auth/me" needs to be accessible so the frontend knows the user is pending
  if (decoded.role === "pending" && !path.startsWith("/api/auth/me")) {
    res.status(403).json({
      success: false,
      status: "PENDING_APPROVAL",
      message: "您的账号正在等待管理员审核，目前无法使用系统功能。"
    });
    return;
  }

  next();
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: "未登录或登录已过期。" });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({ success: false, message: "拒绝访问：需要管理员权限。" });
    return;
  }

  next();
}
