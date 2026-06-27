import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { authMiddleware, requireAdmin } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { validate } from "../../middleware/validate";
import { hashPassword } from "../../auth/password";

const router = Router();

router.use(authMiddleware, requireAdmin);

const idParamsSchema = z.object({
  id: z.string().trim().min(1),
});

const roleSchema = z.enum(["admin", "writer", "pending"]);
const statusSchema = z.enum(["active", "pending_review", "disabled"]);

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_.-]+$/),
  displayName: z.string().trim().max(40).nullable().optional(),
  password: z.string().min(8).max(120),
  role: roleSchema.default("writer"),
  status: statusSchema.default("active"),
});

const updateUserSchema = z.object({
  displayName: z.string().trim().max(40).nullable().optional(),
  password: z.string().min(8).max(120).optional(),
  role: roleSchema.optional(),
  status: statusSchema.optional(),
});

function selectUser() {
  return {
    id: true,
    username: true,
    displayName: true,
    role: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}

router.get("/", async (_req, res, next) => {
  try {
    const data = await prisma.user.findMany({
      select: selectUser(),
      orderBy: [{ createdAt: "asc" }],
    });
    res.status(200).json({
      success: true,
      data,
      message: "成员列表已加载。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.post("/", validate({ body: createUserSchema }), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createUserSchema>;
    const data = await prisma.user.create({
      data: {
        username: body.username,
        displayName: body.displayName ?? null,
        passwordHash: hashPassword(body.password),
        role: body.role,
        status: body.status,
      },
      select: selectUser(),
    });
    res.status(201).json({
      success: true,
      data,
      message: "成员已创建。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", validate({ params: idParamsSchema, body: updateUserSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    const body = req.body as z.infer<typeof updateUserSchema>;
    if (id === "admin" && body.status === "disabled") {
      throw new AppError("初始管理员不能停用。", 400);
    }
    const data = await prisma.user.update({
      where: { id },
      data: {
        ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
      },
      select: selectUser(),
    });
    if (body.password || body.status === "disabled") {
      await prisma.userSession.deleteMany({ where: { userId: id } });
    }
    res.status(200).json({
      success: true,
      data,
      message: "成员已更新。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", validate({ params: idParamsSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as z.infer<typeof idParamsSchema>;
    if (id === "admin") {
      throw new AppError("初始管理员不能删除。", 400);
    }
    await prisma.userSession.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });
    res.status(200).json({
      success: true,
      data: null,
      message: "成员已删除。",
    } satisfies ApiResponse<null>);
  } catch (error) {
    next(error);
  }
});

export default router;
