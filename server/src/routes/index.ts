import { Router } from "express";
import type { DB } from "../db";
import { cuisinesRouter } from "./cuisines";
import { spinRouter } from "./spin";
import { recipesRouter } from "./recipes";
import { favoritesRouter } from "./favorites";
import { checkinsRouter } from "./checkins";
import { badgesRouter } from "./badges";
import { profileRouter } from "./profile";

/** /api 路由挂载点（均为需设备会话的接口）。 */
export function apiRouter(db: DB): Router {
  const router = Router();
  router.use(cuisinesRouter(db));
  router.use(spinRouter(db));
  router.use(recipesRouter(db));
  router.use(favoritesRouter(db));
  router.use(checkinsRouter(db));
  router.use(badgesRouter(db));
  router.use(profileRouter(db));
  return router;
}
