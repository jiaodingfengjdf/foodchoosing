import express, { type Express } from "express";
import helmet from "helmet";
import type { DB } from "./db";
import { deviceAuth } from "./middleware/device";
import { errorHandler } from "./util/http";
import { apiRouter } from "./routes";
import { eventsRouter } from "./routes/events";

export function createApp(db: DB): Express {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "1mb" }));

  // 埋点先挂：sendBeacon 无法携带自定义头，允许匿名并用 body.device_id 标识。
  app.use("/api", deviceAuth(db, { required: false }), eventsRouter(db));

  // 其余 /api 需设备会话。注意只约束 /api——浏览器加载 JS/CSS/图片等静态资源时
  // 无法携带自定义头，若全局强制会把生产环境的 SPA 直接挡在 401 之外。
  app.use("/api", deviceAuth(db, { required: true }), apiRouter(db));

  app.use(errorHandler);
  return app;
}
