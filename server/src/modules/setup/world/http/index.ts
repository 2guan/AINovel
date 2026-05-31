import { Router } from "express";
import { authMiddleware } from "../../../../middleware/auth";
import { checkWorldAccess } from "../../../../middleware/tenant";
import { registerCoreWorldRoutes } from "./worldCoreRoutes";
import { registerGenerationWorldRoutes } from "./worldGenerationRoutes";
import { registerStructureWorldRoutes } from "./worldStructureRoutes";
import { registerVisualizationWorldRoutes } from "./worldVisualizationRoutes";

const router = Router();

router.use(authMiddleware);
router.use("/:id", checkWorldAccess);

registerGenerationWorldRoutes(router);
registerCoreWorldRoutes(router);
registerStructureWorldRoutes(router);
registerVisualizationWorldRoutes(router);

export default router;
