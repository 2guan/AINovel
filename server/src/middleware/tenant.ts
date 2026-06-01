import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma";

/**
 * Middleware to check if the current user has access to the requested novel.
 * Intercepts routes that contain a novel ID in params, body, or query.
 */
export async function checkNovelAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "未登录或登录已过期。" });
    return;
  }

  // Admin has God-eye access
  if (req.user.role === "admin") {
    return next();
  }

  const novelId = req.params.id || req.params.novelId || req.body.novelId || req.query.novelId as string;
  if (!novelId) {
    return next();
  }

  // Exempt reserved static segments under /api/novels from being treated as novelIds
  const EXEMPT_SEGMENTS = new Set(["director", "framing", "resource-recommendation"]);
  if (EXEMPT_SEGMENTS.has(novelId)) {
    return next();
  }

  try {
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { userId: true },
    });

    if (!novel) {
      res.status(404).json({ success: false, message: "小说不存在。" });
      return;
    }

    if (novel.userId !== req.user.id) {
      res.status(403).json({ success: false, message: "无权访问此小说。" });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check if the current user has access to the requested world setting.
 * Allows reading global settings (userId === null) but blocks modifications.
 */
export async function checkWorldAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "未登录或登录已过期。" });
    return;
  }

  if (req.user.role === "admin") {
    return next();
  }

  const worldId = req.params.id || req.body.worldId || req.query.worldId as string;
  if (!worldId) {
    return next();
  }

  try {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
      select: { userId: true },
    });

    if (!world) {
      res.status(404).json({ success: false, message: "世界设定不存在。" });
      return;
    }

    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (isWrite) {
      if (world.userId !== req.user.id) {
        res.status(403).json({ success: false, message: "无权修改此世界设定。" });
        return;
      }
    } else {
      if (world.userId !== null && world.userId !== req.user.id) {
        res.status(403).json({ success: false, message: "无权查看此世界设定。" });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check if the current user has access to the requested knowledge document.
 * Allows reading global documents (userId === null) but blocks modifications.
 */
export async function checkKnowledgeAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: "未登录或登录已过期。" });
    return;
  }

  if (req.user.role === "admin") {
    return next();
  }

  const documentId = req.params.id || req.body.documentId || req.query.documentId as string;
  if (!documentId) {
    return next();
  }

  try {
    const doc = await prisma.knowledgeDocument.findUnique({
      where: { id: documentId },
      select: { userId: true },
    });

    if (!doc) {
      res.status(404).json({ success: false, message: "知识库文档不存在。" });
      return;
    }

    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (isWrite) {
      if (doc.userId !== req.user.id) {
        res.status(403).json({ success: false, message: "无权修改此知识库文档。" });
        return;
      }
    } else {
      if (doc.userId !== null && doc.userId !== req.user.id) {
        res.status(403).json({ success: false, message: "无权查看此知识库文档。" });
        return;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
