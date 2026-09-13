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
  app.use(deviceAuth(db, { required: true }));
  app.use("/api", apiRouter(db));
  app.use(errorHandler);
  return app;
}
