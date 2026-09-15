import { Router, type Response } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import type { RecipeRow } from "../services/roulette";
import { toRecipeDTO, cuisineAncestors, type FavoriteDTO, type SceneTag } from "../serialize";
import { HttpError } from "../util/http";
import { nowIso } from "../util/dates";

const bodySchema = z.object({ recipe_id: z.string() });

/** 收藏：列表（带地域/场景聚合）、新增（幂等）、取消。 */
export function favoritesRouter(db: DB): Router {
  const router = Router();

  const selectFavorites = db.prepare(
    `SELECT r.*, f.created_at AS favorited_at
       FROM favorites f JOIN recipes r ON r.id = f.recipe_id
      WHERE f.user_id = ? ORDER BY f.created_at DESC`
  );
  const selectRecipe = db.prepare("SELECT id FROM recipes WHERE id = ?");
  const insertFavorite = db.prepare(
    "INSERT OR IGNORE INTO favorites (user_id, recipe_id, created_at) VALUES (?, ?, ?)"
  );
  const deleteFavorite = db.prepare("DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?");

  router.get("/favorites", (req: AuthedRequest, res: Response) => {
    const rows = selectFavorites.all(req.user!.id) as (RecipeRow & { favorited_at: string })[];
    const items: FavoriteDTO[] = rows.map((row) => {
      const ancestors = cuisineAncestors(db, row.cuisine_id);
      const scene_tags: SceneTag[] = [];
      if (row.minutes <= 15) scene_tags.push("quick");
      if (row.minutes >= 45) scene_tags.push("weekend");
      return {
        ...toRecipeDTO(db, row),
        favorited_at: row.favorited_at,
        continent: ancestors.find((a) => a.level === 1)?.name ?? "",
        country: ancestors.find((a) => a.level === 3)?.name ?? "",
        scene_tags,
      };
    });
    res.json({ items });
  });

  router.post("/favorites", (req: AuthedRequest, res: Response) => {
    const { recipe_id } = bodySchema.parse(req.body);
    if (!selectRecipe.get(recipe_id)) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    insertFavorite.run(req.user!.id, recipe_id, nowIso());
    res.json({ ok: true });
  });

  router.delete("/favorites/:recipeId", (req: AuthedRequest, res: Response) => {
    deleteFavorite.run(req.user!.id, req.params.recipeId);
    res.json({ ok: true });
  });

  return router;
}
