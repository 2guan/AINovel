import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import { checkNovelAccess } from "../../../middleware/tenant";
import { createNovelHttpServices } from "./novelHttpServices";
import { registerNovelHttpRoutes } from "./novelRouteRegistration";

/**
 * CUID v1/v2 IDs are 25 chars starting with 'c', or 24 chars starting with 'c'.
 * Static keyword routes like /framing, /resource-recommendation, /director are
 * never valid novel IDs and must not trigger checkNovelAccess.
 * This guard ensures we only call checkNovelAccess when the first path segment
 * looks like a real novel ID.
 */
const NOVEL_ID_PATTERN = /^c[a-z0-9]{20,}$/i;

function novelAccessGuard(paramName: "id" | "novelId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName] as string | undefined;
    if (!paramValue || !NOVEL_ID_PATTERN.test(paramValue)) {
      // Not a novel-ID-shaped segment — skip access check, let the route handle it
      next();
      return;
    }
    void checkNovelAccess(req, res, next);
  };
}

const router = Router();
const services = createNovelHttpServices();

router.use(authMiddleware);
router.use("/:id", novelAccessGuard("id"));
router.use("/:novelId", novelAccessGuard("novelId"));

registerNovelHttpRoutes(router, services);

export default router;
