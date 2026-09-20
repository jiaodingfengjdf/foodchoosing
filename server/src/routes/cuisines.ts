import { Router } from "express";
import type { DB } from "../db";

type CuisineRow = {
  id: string; level: number; parent_id: string | null; name: string; name_en: string; tags: string;
};

/** GET /cuisines/tree —— 平铺返回全部菜系节点，客户端自行组树。 */
export function cuisinesRouter(db: DB): Router {
  const router = Router();

  const selectAll = db.prepare("SELECT * FROM cuisines ORDER BY level, id");
  const selectCounts = db.prepare("SELECT cuisine_id, COUNT(*) AS n FROM recipes GROUP BY cuisine_id");

  router.get("/cuisines/tree", (_req, res) => {
    const cuisines = selectAll.all() as CuisineRow[];
    const counts = selectCounts.all() as { cuisine_id: string; n: number }[];
    const countMap = new Map(counts.map((c) => [c.cuisine_id, c.n]));
    for (const cuisine of [...cuisines].sort((a, b) => b.level - a.level)) {
      if (cuisine.parent_id) countMap.set(cuisine.parent_id,
        (countMap.get(cuisine.parent_id) ?? 0) + (countMap.get(cuisine.id) ?? 0));
    }
    res.json({
      nodes: cuisines.map((c) => ({
        id: c.id,
        level: c.level,
        parent_id: c.parent_id,
        name: c.name,
        name_en: c.name_en,
        tags: JSON.parse(c.tags) as string[],
        dish_count: countMap.get(c.id) ?? 0,
      })),
    });
  });

  return router;
}
