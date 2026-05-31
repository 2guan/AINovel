import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import { checkNovelAccess } from "../../../middleware/tenant";
import { createNovelHttpServices } from "./novelHttpServices";
import { registerNovelHttpRoutes } from "./novelRouteRegistration";

const router = Router();
const services = createNovelHttpServices();

router.use(authMiddleware);
router.use("/:id", checkNovelAccess);
router.use("/:novelId", checkNovelAccess);

registerNovelHttpRoutes(router, services);

export default router;
