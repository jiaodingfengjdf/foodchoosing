import { Router, type Response } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { blockRecipe } from "../services/roulette";
import { HttpError } from "../util/http";

/** 菜谱相关路由（Task 8 先提供拉黑；Task 9 补详情/收藏）。 */
export function recipesRouter(db: DB): Router {
  const router = Router();

  const selectRecipe = db.prepare("SELECT id FROM recipes WHERE id = ?");

  router.post("/recipes/:id/block", (req: AuthedRequest, res: Response) => {
    const row = selectRecipe.get(req.params.id);
    if (!row) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    blockRecipe(db, req.user!.id, req.params.id, new Date());
    res.json({ ok: true });
  });

  return router;
}
