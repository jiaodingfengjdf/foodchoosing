import path from "node:path";
import fs from "node:fs";
import express from "express";
import { openDb } from "./db";
import { seedAll } from "./seed";
import { seedRecipes } from "./seed/recipes";
import { createApp } from "./app";

const db = openDb();
seedAll(db);
seedRecipes(db);
const app = createApp(db);

// 生产：单进程托管前端构建产物与静态资源
const clientDist = path.resolve("../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use("/uploads", express.static(path.resolve("uploads")));
  app.use("/dish-images", express.static(path.resolve("public/dish-images")));
  // SPA fallback：非 API/静态路径一律回 index.html
  app.use((req, res, next) => {
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/dish-images")
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  console.warn(`[warn] 未找到前端构建产物 ${clientDist}，仅提供 /api 服务`);
}

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`WhatToEat server listening on http://localhost:${PORT}`));
