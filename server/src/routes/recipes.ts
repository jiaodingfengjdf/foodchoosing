import { Router, type Response } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import type { RecipeRow } from "../services/roulette";
import { blockRecipe } from "../services/roulette";
import { toRecipeDTO } from "../serialize";
import { HttpError } from "../util/http";
import { z } from "zod";

/** 菜谱详情与临时拉黑。 */
export function recipesRouter(db: DB): Router {
  const router = Router();

  const selectRecipe = db.prepare("SELECT * FROM recipes WHERE id = ?");
  const selectFavorite = db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?");
  const selectBlocked = db.prepare(
    "SELECT 1 FROM blocks WHERE user_id = ? AND recipe_id = ? AND blocked_until > ?"
  );

  router.get("/recipes", (req: AuthedRequest, res: Response) => {
    const query = z.object({
      q: z.string().max(80).optional(), cuisine: z.string().max(80).optional(),
      max_minutes: z.coerce.number().int().min(5).max(1440).optional(),
      photos: z.enum(["true", "false"]).optional(),
      status: z.enum(["all", "cooked", "uncooked", "favorites"]).default("all"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(60).default(24),
    }).parse(req.query);
    const where: string[] = [];
    const args: (string | number)[] = [req.user!.id, req.user!.id];
    if (query.q?.trim()) {
      where.push("(r.name LIKE ? ESCAPE '\\' OR r.name_en LIKE ? ESCAPE '\\' OR r.ingredients LIKE ? ESCAPE '\\')");
      const search = `%${query.q.trim().replace(/[\\%_]/g, "\\$&")}%`;
      args.push(search, search, search);
    }
    if (query.cuisine) {
      where.push(`r.cuisine_id IN (WITH RECURSIVE sub(id) AS
        (SELECT id FROM cuisines WHERE id=? UNION ALL SELECT c.id FROM cuisines c JOIN sub ON c.parent_id=sub.id)
        SELECT id FROM sub)`);
      args.push(query.cuisine);
    }
    if (query.max_minutes) { where.push("r.minutes <= ?"); args.push(query.max_minutes); }
    if (query.photos === "true") where.push("r.image_path IS NOT NULL");
    if (query.status === "favorites") where.push("is_favorite=1");
    if (query.status === "cooked") where.push("is_cooked=1");
    if (query.status === "uncooked") where.push("is_cooked=0");
    const base = `SELECT r.*,
      EXISTS(SELECT 1 FROM favorites f WHERE f.user_id=? AND f.recipe_id=r.id) AS is_favorite,
      EXISTS(SELECT 1 FROM checkins c WHERE c.user_id=? AND c.recipe_id=r.id) AS is_cooked
      FROM recipes r ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`;
    const total = (db.prepare(`SELECT COUNT(*) AS n FROM (${base})`).get(...args) as { n: number }).n;
    const rows = db.prepare(`${base} ORDER BY (r.image_path IS NOT NULL) DESC, r.name, r.id LIMIT ? OFFSET ?`)
      .all(...args, query.limit, (query.page - 1) * query.limit) as (RecipeRow & { is_favorite: number; is_cooked: number })[];
    const stats = db.prepare(`SELECT COUNT(*) AS catalog_total, COUNT(image_path) AS photo_count,
      COUNT(DISTINCT cuisine_id) AS cuisine_count FROM recipes`).get() as object;
    res.json({ ...stats, total, items: rows.map((row) => ({ ...toRecipeDTO(db, row),
      is_favorite: !!row.is_favorite, is_cooked: !!row.is_cooked })) });
  });

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
