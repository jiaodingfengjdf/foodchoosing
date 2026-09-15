import { Router, type Response } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import type { RecipeRow } from "../services/roulette";
import { blockRecipe } from "../services/roulette";
import { toRecipeDTO } from "../serialize";
import { HttpError } from "../util/http";

/** 菜谱详情与临时拉黑。 */
export function recipesRouter(db: DB): Router {
  const router = Router();

  const selectRecipe = db.prepare("SELECT * FROM recipes WHERE id = ?");
  const selectFavorite = db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?");
  const selectBlocked = db.prepare(
    "SELECT 1 FROM blocks WHERE user_id = ? AND recipe_id = ? AND blocked_until > ?"
  );

  router.get("/recipes/:id", (req: AuthedRequest, res: Response) => {
    const row = selectRecipe.get(req.params.id) as RecipeRow | undefined;
    if (!row) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    res.json({
      recipe: {
        ...toRecipeDTO(db, row),
        is_favorite: !!selectFavorite.get(req.user!.id, req.params.id),
        is_blocked: !!selectBlocked.get(req.user!.id, req.params.id, new Date().toISOString()),
      },
    });
  });

  router.post("/recipes/:id/block", (req: AuthedRequest, res: Response) => {
    if (!selectRecipe.get(req.params.id)) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    blockRecipe(db, req.user!.id, req.params.id, new Date());
    res.json({ ok: true });
  });

  return router;
}
