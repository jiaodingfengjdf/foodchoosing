import { Router } from "express";
import type { DB } from "../db";

/**
 * /api 路由挂载点。Task 8 起逐个 router.use 挂载具体子路由。
 */
export function apiRouter(db: DB): Router {
  const router = Router();
  void db;
  return router;
}
