import express, { type Express } from "express";
import helmet from "helmet";
import type { DB } from "./db";
import { deviceAuth } from "./middleware/device";
import { errorHandler } from "./util/http";
import { apiRouter } from "./routes";
import { eventsRouter } from "./routes/events";

export function createApp(db: DB): Express {
  const app = express();
  app.use(
    helmet({
      // 顶图/打卡照片需跨源读取策略放宽
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        // canvas-confetti 默认用 blob worker 渲染粒子；Helmet 默认的 script-src 'self'
        // 会把它拦掉（粒子仍会退化到主线程渲染，但控制台会持续报 CSP 违规）。
        // 本地照片压缩读取 blob URL，离线照片通过 fetch(data URL) 转回 Blob。
        directives: {
          "worker-src": ["'self'", "blob:"],
          "img-src": ["'self'", "data:", "blob:"],
          "connect-src": ["'self'", "data:"],
        },
      },
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // 埋点先挂：sendBeacon 无法携带自定义头，允许匿名并用 body.device_id 标识。
  app.use("/api", deviceAuth(db, { required: false }), eventsRouter(db));

  // 其余 /api 需设备会话。注意只约束 /api——浏览器加载 JS/CSS/图片等静态资源时
  // 无法携带自定义头，若全局强制会把生产环境的 SPA 直接挡在 401 之外。
  app.use("/api", deviceAuth(db, { required: true }), apiRouter(db));

  app.use(errorHandler);
  return app;
}
