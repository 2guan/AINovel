import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { hashPassword, comparePassword, generateToken } from "../utils/auth";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();

const registerSchema = z.object({
  username: z.string().trim().min(3).max(30),
  password: z.string().min(6).max(100),
  confirmPassword: z.string().min(6).max(100),
}).refine((data) => data.password === data.confirmPassword, {
  message: "两次输入的密码不一致。",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

// Register route
router.post("/register", validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(400).json({ success: false, message: "用户名已被注册。" });
      return;
    }

    const passwordHash = await hashPassword(password);
    
    // The very first user will be registered as admin, otherwise pending
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? "admin" : "pending";

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      message: role === "admin" ? "系统管理员账号注册成功并已自动激活。" : "注册成功，账号正在等待管理员审核。",
    } satisfies ApiResponse<any>);
  } catch (error) {
    next(error);
  }
});

// Login route
router.post("/login", validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "用户名或密码错误。" });
      return;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "用户名或密码错误。" });
      return;
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
      message: "登录成功。",
    } satisfies ApiResponse<any>);
  } catch (error) {
    next(error);
  }
});

// Get profile route
router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "未登录。" });
      return;
    }

    // Fetch fresh user data from DB to verify role
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "用户不存在或已被删除。" });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
      message: "获取用户信息成功。",
    } satisfies ApiResponse<typeof user>);
  } catch (error) {
    next(error);
  }
});

// Change password route
router.post("/change-password", authMiddleware, validate({ body: changePasswordSchema }), async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "未登录。" });
      return;
    }

    const { oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(401).json({ success: false, message: "用户不存在。" });
      return;
    }

    const isMatch = await comparePassword(oldPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ success: false, message: "旧密码错误。" });
      return;
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({
      success: true,
      data: null,
      message: "密码修改成功，请使用新密码重新登录。",
    } satisfies ApiResponse<null>);
  } catch (error) {
    next(error);
  }
});

export default router;
