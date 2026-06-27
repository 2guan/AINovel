import { Router } from "express";
import { prisma } from "../../../db/prisma";
import { authMiddleware } from "../../../middleware/auth";
import { createNovelHttpServices } from "./novelHttpServices";
import { registerNovelHttpRoutes } from "./novelRouteRegistration";

const router = Router();
const services = createNovelHttpServices();

router.use(authMiddleware);
router.param("id", async (req, res, next, id) => {
  try {
    if (req.user?.role === "admin") {
      next();
      return;
    }
    const row = await prisma.novel.findFirst({
      where: {
        id,
        userId: req.user?.id ?? "",
      },
      select: { id: true },
    });
    if (!row) {
      res.status(404).json({
        success: false,
        error: "小说不存在。",
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});
registerNovelHttpRoutes(router, services);

export default router;
