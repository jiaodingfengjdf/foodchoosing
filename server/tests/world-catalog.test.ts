import { afterEach, beforeEach, expect, it } from "vitest";
import request from "supertest";
import { openDb, type DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";
import { cuisineAncestors } from "../src/serialize";
import worldRecipes from "../src/seed/data/world-recipes.json";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); seedAll(db); seedRecipes(db); });
afterEach(() => db.close());

it("海外新增覆盖29国，各国至少5道，均有中文步骤与可追溯实拍", () => {
  const countries = new Map<string, number>();
  for (const r of worldRecipes) {
    const chain = cuisineAncestors(db, r.cuisineId);
    expect(chain.map(c => c.level)).toEqual([1, 2, 3, 4]);
    expect(chain[2].id).not.toBe("china");
    countries.set(chain[2].id, (countries.get(chain[2].id) ?? 0) + 1);
    expect(r.steps.length).toBeGreaterThanOrEqual(3);
    expect(r.steps.every(s => /[\u4e00-\u9fff]/.test(s.text))).toBe(true);
    expect(r.ingredients.every(i => /[\u4e00-\u9fff]/.test(i.name))).toBe(true);
    expect(r.originalInstructions.length).toBeGreaterThan(100);
    expect(r.imageCredit).toContain("TheMealDB");
    expect(r.imagePath).toBe(`/dish-images/${r.id}.jpg`);
    expect(r.kcal).toBe(0); // No nutrition facts supplied by this source.
  }
  expect(countries.size).toBe(29);
  expect(Math.min(...countries.values())).toBeGreaterThanOrEqual(5);
  expect(new Set(worldRecipes.map(r => r.id)).size).toBe(worldRecipes.length);
});

it("按洲筛选不串区，非洲和大洋洲可浏览且中国菜数量不变", async () => {
  const app = createApp(db);
  const totals: Record<string, number> = {};
  for (const continent of ["asia", "europe", "north-america", "south-america", "africa", "oceania"]) {
    const res = await request(app).get(`/api/recipes?cuisine=${continent}&limit=60`).set("X-Device-Id", "world-test");
    expect(res.status).toBe(200);
    totals[continent] = res.body.total;
    expect(res.body.total).toBeGreaterThan(0);
    for (const r of res.body.items) expect(cuisineAncestors(db, r.cuisine_id)[0].id).toBe(continent);
  }
  expect(totals.africa).toBeGreaterThanOrEqual(25);
  expect(totals.oceania).toBeGreaterThanOrEqual(7);
  const china = await request(app).get("/api/recipes?cuisine=china").set("X-Device-Id", "world-test");
  expect(china.body.total).toBe(142);
  expect(china.body.catalog_total - china.body.total).toBeGreaterThanOrEqual(220);
});

it("详情包含原文和用量，重置种子不会重复增加菜谱", async () => {
  seedAll(db); seedRecipes(db);
  const res = await request(createApp(db)).get("/api/recipes/WORLD_53476").set("X-Device-Id", "world-test");
  expect(res.status).toBe(200);
  expect(res.body.recipe.name).toBe("巴西奶酪面包");
  expect(res.body.recipe.original_instructions).toContain("tapioca");
  expect(res.body.recipe.servings_note).toContain("原始用量");
  const count = db.prepare("SELECT COUNT(*) AS n FROM recipes WHERE id LIKE 'WORLD_%'").get() as { n: number };
  expect(count.n).toBe(worldRecipes.length);
});
