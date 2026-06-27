import { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  changePassword,
  createSessionForLogin,
  extractBearerToken,
  registerPendingUser,
  revokeSession,
} from "../auth/session";

const router = Router();

const usernameSchema = z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_.-]+$/, "用户名只能包含字母、数字、点、下划线或短横线。");
const passwordSchema = z.string().min(8).max(120);

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1),
});

const registerSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(40).optional(),
  password: passwordSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  nextPassword: passwordSchema,
});

router.post("/login", validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const data = await createSessionForLogin(req.body as z.infer<typeof loginSchema>);
    res.status(200).json({
      success: true,
      data,
      message: "登录成功。",
    } satisfies ApiResponse<typeof data>);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error instanceof Error ? error.message : "登录失败。",
    } satisfies ApiResponse<null>);
  }
});

router.post("/register", validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const user = await registerPendingUser(req.body as z.infer<typeof registerSchema>);
    res.status(201).json({
      success: true,
      data: user,
      message: "注册成功，账号等待管理员审核。",
    } satisfies ApiResponse<typeof user>);
  } catch (error) {
    next(error);
  }
});

router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
    message: "当前用户已加载。",
  } satisfies ApiResponse<typeof req.user>);
});

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      await revokeSession(token);
    }
    res.status(200).json({
      success: true,
      data: null,
      message: "已退出登录。",
    } satisfies ApiResponse<null>);
  } catch (error) {
    next(error);
  }
});

router.put("/password", authMiddleware, validate({ body: changePasswordSchema }), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof changePasswordSchema>;
    await changePassword({
      userId: req.user!.id,
      currentPassword: body.currentPassword,
      nextPassword: body.nextPassword,
    });
    res.status(200).json({
      success: true,
      data: null,
      message: "密码已更新，请重新登录。",
    } satisfies ApiResponse<null>);
  } catch (error) {
    next(error);
  }
});

export default router;
