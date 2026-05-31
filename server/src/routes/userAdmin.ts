import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { hashPassword } from "../utils/auth";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

// Apply auth and admin check globally to this router
router.use(authMiddleware);
router.use(adminMiddleware);

const idParamSchema = z.object({
  id: z.string().trim().min(1),
});

const changeRoleSchema = z.object({
  role: z.enum(["admin", "user", "pending"]),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(30),
  password: z.string().min(6).max(100),
  role: z.enum(["admin", "user", "pending"]).default("user"),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6).max(100),
});

// GET all users
router.get("/users", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: users,
      message: "获取用户列表成功。",
    } satisfies ApiResponse<typeof users>);
  } catch (error) {
    next(error);
  }
});

// PATCH change user role
router.patch("/users/:id/role", validate({ params: idParamSchema, body: changeRoleSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { role } = req.body;

    // Prevent changing your own role if you are the logged in admin
    if (id === req.user?.id) {
      res.status(400).json({ success: false, message: "无法修改您自己账号的角色。" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: `已成功将用户角色修改为 "${role}"。`,
    } satisfies ApiResponse<typeof updatedUser>);
  } catch (error) {
    next(error);
  }
});

// POST manually create a user
router.post("/users/create", validate({ body: createUserSchema }), async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: "用户名已被注册。" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
      message: "成功手动创建用户。",
    } satisfies ApiResponse<typeof user>);
  } catch (error) {
    next(error);
  }
});

// POST reset user password
router.post("/users/:id/reset-password", validate({ params: idParamSchema, body: resetPasswordSchema }), async (req, res, next) => {
  try {
    const { id } = req.params as { id: string };
    const { newPassword } = req.body;

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    res.status(200).json({
      success: true,
      data: null,
      message: "用户密码已成功重置。",
    } satisfies ApiResponse<null>);
  } catch (error) {
    next(error);
  }
});

export default router;
