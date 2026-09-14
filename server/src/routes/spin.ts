import { Router, type Response } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { spin, rerollSpin } from "../services/roulette";
import { toRecipeDTO } from "../serialize";

const bodySchema = z.object({
  cuisine_id: z.string().nullable(),
  source: z.enum(["all", "favorites"]),
});

/** POST /spin、POST /spin/reroll —— 转盘与「换一个」。 */
export function spinRouter(db: DB): Router {
  const router = Router();

  const handler =
    (mode: "spin" | "reroll") => (req: AuthedRequest, res: Response) => {
      const body = bodySchema.parse(req.body);
      const r =
        mode === "spin"
          ? spin(db, req.user!.id, body.cuisine_id, body.source)
          : rerollSpin(db, req.user!.id, body.cuisine_id, body.source);
      res.json({
        result: toRecipeDTO(db, r.result),
        candidates: r.candidates.map((c) => toRecipeDTO(db, c)),
        pooled_up: r.pooledUp,
        reroll_left: r.rerollLeft,
      });
    };

  router.post("/spin", handler("spin"));
  router.post("/spin/reroll", handler("reroll"));
  return router;
}
