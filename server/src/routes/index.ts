import { Router } from "express";
import type { DB } from "../db";
import { cuisinesRouter } from "./cuisines";
import { spinRouter } from "./spin";
import { recipesRouter } from "./recipes";
import { favoritesRouter } from "./favorites";

/** /api 路由挂载点，后续任务继续 router.use 追加。 */
export function apiRouter(db: DB): Router {
  const router = Router();
  router.use(cuisinesRouter(db));
  router.use(spinRouter(db));
  router.use(recipesRouter(db));
  router.use(favoritesRouter(db));
  return router;
}
