import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll, CUISINES } from "../src/seed";
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

describe("GET /api/cuisines/tree", () => {
  it("返回 30 节点，L4 含 dish_count", async () => {
    const res = await request(app).get("/api/cuisines/tree").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.nodes.length).toBe(CUISINES.length);
    const sichuan = res.body.nodes.find((n: any) => n.id === "sichuan");
    expect(sichuan.dish_count).toBeGreaterThanOrEqual(6);
    const asia = res.body.nodes.find((n: any) => n.id === "asia");
    expect(asia.parent_id).toBeNull();
  });
});

describe("POST /api/spin", () => {
  it("返回候选与结果，字段为 DTO 形态", async () => {
    const res = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: "sichuan", source: "all" });
    expect(res.status).toBe(200);
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(6);
    expect(res.body.result.cuisine_path).toContain("川菜");
    expect(Array.isArray(res.body.result.ingredients)).toBe(true);
    expect(res.body.reroll_left).toBe(2);
  });

  it("缺 cuisine_id 与 source 校验失败 400", async () => {
    const res = await request(app).post("/api/spin").set(DEV).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("收藏夹数据源为空时 404 EMPTY_POOL", async () => {
    const res = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: null, source: "favorites" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("EMPTY_POOL");
  });
});

describe("POST /api/spin/reroll", () => {
  it("两次后第三次 429 REROLL_EXHAUSTED", async () => {
    const body = { cuisine_id: "sichuan", source: "all" };
    await request(app).post("/api/spin/reroll").set(DEV).send(body);
    await request(app).post("/api/spin/reroll").set(DEV).send(body);
    const res = await request(app).post("/api/spin/reroll").set(DEV).send(body);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("REROLL_EXHAUSTED");
  });
});

describe("POST /api/recipes/:id/block", () => {
  it("写入 30 天拉黑，转盘不再转出", async () => {
    const res = await request(app).post("/api/recipes/RC_SC_001/block").set(DEV);
    expect(res.status).toBe(200);
    const spin = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: "sichuan", source: "all" });
    expect(spin.body.candidates.some((c: any) => c.id === "RC_SC_001")).toBe(false);
  });

  it("未知菜谱 404", async () => {
    const res = await request(app).post("/api/recipes/RC_NOPE/block").set(DEV);
    expect(res.status).toBe(404);
  });
});
