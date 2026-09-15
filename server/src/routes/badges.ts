import { Router, type Response } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { listBadgesForUser } from "../services/badges";

/** 徽章墙：8 枚定义 + 当前用户进度与解锁状态。 */
export function badgesRouter(db: DB): Router {
  const router = Router();

  router.get("/badges", (req: AuthedRequest, res: Response) => {
    res.json({ badges: listBadgesForUser(db, req.user!.id) });
  });

  return router;
}
