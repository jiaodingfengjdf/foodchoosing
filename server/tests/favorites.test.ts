import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";

let db: DB;
let app: ReturnType<typeof createApp>;
const DEV = { "X-Device-Id": "dev-1" };

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  app = createApp(db);
});

/** better-sqlite3 的 get() 返回 unknown，需显式断言行形态 */
const row = <T>(sql: string, ...params: unknown[]): T => db.prepare(sql).get(...params) as T;

describe("GET /api/recipes/:id", () => {
  it("返回完整 DTO，含 is_favorite/is_blocked 与 cuisine_path", async () => {
    const res = await request(app).get("/api/recipes/RC_GR_001").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.recipe.name).toBe("希腊沙拉");
    expect(res.body.recipe.cuisine_path).toBe("欧洲 > 南欧 > 希腊 > 克里特菜");
    expect(res.body.recipe.is_favorite).toBe(false);
    expect(res.body.recipe.is_blocked).toBe(false);
  });

  it("404", async () => {
    const res = await request(app).get("/api/recipes/NOPE").set(DEV);
    expect(res.status).toBe(404);
  });
});

describe("favorites", () => {
  it("收藏 → 列表含聚合字段 → 取消收藏", async () => {
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_003" });
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_004" });

    const list = await request(app).get("/api/favorites").set(DEV);
    expect(list.body.items.length).toBe(2);
    const quick = list.body.items.find((i: any) => i.id === "RC_YU_003");
    expect(quick.scene_tags).toContain("quick");
    expect(quick.continent).toBe("亚洲");
    expect(quick.country).toBe("中国");

    // 重复收藏幂等
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_003" });
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM favorites").n).toBe(2);

    // 详情页 is_favorite 变 true
    const detail = await request(app).get("/api/recipes/RC_YU_003").set(DEV);
    expect(detail.body.recipe.is_favorite).toBe(true);

    await request(app).delete("/api/favorites/RC_YU_003").set(DEV);
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM favorites").n).toBe(1);
  });

  it("收藏不存在菜谱 404", async () => {
    const res = await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "NOPE" });
    expect(res.status).toBe(404);
  });
});
