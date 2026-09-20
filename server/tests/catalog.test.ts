import { beforeEach, afterEach, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { openDb, type DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes, RECIPE_SEEDS } from "../src/seed/recipes";
import { createApp } from "../src/app";
let db: DB;
const device = { "X-Device-Id": "catalog-test" };
beforeEach(() => { db = openDb(":memory:"); seedAll(db); seedRecipes(db); });
afterEach(() => db.close());

it("菜库有可用实拍、完整做法和可追溯来源", () => {
  const rows = db.prepare("SELECT * FROM recipes").all() as { id: string; image_path: string | null; ingredients: string; steps: string; metadata: string }[];
  expect(rows.length).toBeGreaterThanOrEqual(200);
  expect(rows.filter(r => r.image_path).length).toBeGreaterThanOrEqual(140);
  for (const row of rows) {
    expect(JSON.parse(row.ingredients).length, row.id).toBeGreaterThan(0);
    expect(JSON.parse(row.steps).length, row.id).toBeGreaterThan(1);
    if (row.image_path) {
      expect(fs.existsSync(path.resolve("public", `.${row.image_path}`)), row.id).toBe(true);
      expect(JSON.parse(row.metadata).source_url).toMatch(row.id.startsWith("WORLD_")
        ? /^https:\/\/www.themealdb.com\/meal.php\?c=\d+$/
        : /^https:\/\/github.com\/Anduin2017\/HowToCook\//);
    }
  }
});

it("支持分页、地区子树、食材搜索和时间过滤", async () => {
  const app = createApp(db);
  const first = await request(app).get("/api/recipes?limit=8").set(device);
  expect(first.status).toBe(200);
  expect(first.body.catalog_total).toBe(RECIPE_SEEDS.length);
  const second = await request(app).get("/api/recipes?limit=8&page=2").set(device);
  expect(first.body.items).toHaveLength(8);
  expect(second.body.items.some((r: { id: string }) => first.body.items.some((a: { id: string }) => a.id === r.id))).toBe(false);
  const region = await request(app).get("/api/recipes?cuisine=hunan&photos=true&max_minutes=60&q=牛肉").set(device);
  expect(region.status).toBe(200);
  expect(region.body.items.length).toBeGreaterThan(0);
  for (const r of region.body.items) { expect(r.cuisine_id).toBe("hunan"); expect(r.minutes).toBeLessThanOrEqual(60); expect(r.image_path).toBeTruthy(); }
  const china = await request(app).get("/api/recipes?cuisine=china&limit=60").set(device);
  expect(china.body.total).toBeGreaterThan(100);
  expect(china.body.items.every((r: { cuisine_path: string }) => r.cuisine_path.includes("中国"))).toBe(true);
});

it("收藏和打卡筛选严格隔离设备，更新菜库保留用户记录", async () => {
  const app = createApp(db);
  await request(app).post("/api/favorites").set(device).send({ recipe_id: "RC_SC_001" });
  const user = db.prepare("SELECT id FROM users WHERE device_id=?").get("catalog-test") as { id: string };
  db.prepare("INSERT INTO checkins(id,user_id,recipe_id,rating,stat_date,created_at) VALUES('test',?,'RC_SC_001',5,'2026-09-20','2026-09-20T12:00:00Z')").run(user.id);
  seedRecipes(db);
  const favorites = await request(app).get("/api/recipes?status=favorites").set(device);
  expect(favorites.body.items.map((r: { id: string }) => r.id)).toEqual(["RC_SC_001"]);
  const cooked = await request(app).get("/api/recipes?status=cooked").set(device);
  expect(cooked.body.items.map((r: { id: string }) => r.id)).toEqual(["RC_SC_001"]);
  const other = await request(app).get("/api/recipes?status=cooked").set("X-Device-Id", "another");
  expect(other.body.total).toBe(0);
});

it("无效分页返回 400，特殊搜索字符按字面匹配", async () => {
  const app = createApp(db);
  expect((await request(app).get("/api/recipes?page=-1").set(device)).status).toBe(400);
  expect((await request(app).get("/api/recipes?q=%25").set(device)).body.total).toBe(0);
});
