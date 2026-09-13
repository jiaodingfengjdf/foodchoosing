import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { createApp } from "../src/app";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); seedAll(db); });

type UserRowLike = { id: string; device_id: string; settings: string };

describe("deviceAuth", () => {
  it("缺 X-Device-Id 返回 401 NO_DEVICE", async () => {
    const res = await request(createApp(db)).get("/api/anything");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_DEVICE");
  });

  it("首次请求自动注册用户，复用同一设备不重复注册", async () => {
    const app = createApp(db);
    await request(app).get("/api/anything").set("X-Device-Id", "dev-1");
    await request(app).get("/api/anything").set("X-Device-Id", "dev-1");
    const users = db
      .prepare("SELECT * FROM users WHERE device_id='dev-1'")
      .all() as UserRowLike[];
    expect(users.length).toBe(1);
    expect(users[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("未知路由带设备头返回 404", async () => {
    const res = await request(createApp(db)).get("/api/anything").set("X-Device-Id", "dev-1");
    expect(res.status).toBe(404);
  });

  it("不同设备各自注册独立用户", async () => {
    const app = createApp(db);
    await request(app).get("/api/anything").set("X-Device-Id", "dev-a");
    await request(app).get("/api/anything").set("X-Device-Id", "dev-b");
    const n = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(n.n).toBe(2);
  });

  it("settings 默认为空对象字面量", async () => {
    const app = createApp(db);
    await request(app).get("/api/anything").set("X-Device-Id", "dev-s");
    const u = db
      .prepare("SELECT settings FROM users WHERE device_id='dev-s'")
      .get() as { settings: string };
    expect(JSON.parse(u.settings)).toEqual({});
  });
});

describe("errorHandler", () => {
  it("JSON 解析失败返回 400 而非 500", async () => {
    const res = await request(createApp(db))
      .post("/api/anything")
      .set("X-Device-Id", "dev-1")
      .set("Content-Type", "application/json")
      .send("{ 这不是合法 JSON");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBeDefined();
  });
});
