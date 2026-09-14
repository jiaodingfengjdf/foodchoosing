import express, { type Express } from "express";
import helmet from "helmet";
import type { DB } from "./db";
import { deviceAuth } from "./middleware/device";
import { errorHandler } from "./util/http";
import { apiRouter } from "./routes";

export function createApp(db: DB): Express {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  // 设备会话只约束 /api：浏览器加载 JS/CSS/图片等静态资源时无法携带自定义头，
  // 若全局强制会直接把生产环境的 SPA 挡在 401 之外。
  app.use("/api", deviceAuth(db, { required: true }), apiRouter(db));
  app.use(errorHandler);
  return app;
}
