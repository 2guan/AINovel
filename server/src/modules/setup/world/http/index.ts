import { Router } from "express";
import { prisma } from "../../../../db/prisma";
import { authMiddleware } from "../../../../middleware/auth";
import { registerCoreWorldRoutes } from "./worldCoreRoutes";
import { registerGenerationWorldRoutes } from "./worldGenerationRoutes";
import { registerStructureWorldRoutes } from "./worldStructureRoutes";
import { registerVisualizationWorldRoutes } from "./worldVisualizationRoutes";

const router = Router();

router.use(authMiddleware);
router.param("id", async (req, res, next, id) => {
  try {
    if (req.user?.role === "admin") {
      next();
      return;
    }
    const row = await prisma.world.findFirst({
      where: { id, userId: req.user?.id ?? "" },
      select: { id: true },
    });
    if (!row) {
      res.status(404).json({ success: false, error: "World not found." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

registerGenerationWorldRoutes(router);
registerCoreWorldRoutes(router);
registerStructureWorldRoutes(router);
registerVisualizationWorldRoutes(router);

export default router;
