import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";
import { statDate, addDays, nowIso } from "../src/util/dates";

let db: DB;
let app: ReturnType<typeof createApp>;
const DEV = { "X-Device-Id": "dev-1" };
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex");

/** 预置 dev-1 用户：部分用例不经过 HTTP 就要直接落表，而用户行本由 deviceAuth 首次请求时创建。 */
const DEVICE_USER_ID = "u-dev-1";

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, 'dev-1', ?)").run(DEVICE_USER_ID, nowIso());
  app = createApp(db);
});

/** better-sqlite3 的 get() 返回 unknown，需显式断言行形态 */
const row = <T>(sql: string, ...params: unknown[]): T => db.prepare(sql).get(...params) as T;
const uid = () => DEVICE_USER_ID;

describe("POST /api/checkins", () => {
  const post = (extra: Record<string, string> = {}, attach = false) => {
    const r = request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "5")
      .field("review", "很下饭！");
    if (attach) r.attach("photo", PNG, { filename: "dish.png", contentType: "image/png" });
    for (const [k, v] of Object.entries(extra)) r.field(k, v);
    return r;
  };

  it("打卡成功：返回 streak 与 stat_date，照片入库", async () => {
    const res = await post({}, true);
    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(1);
    expect(res.body.max_streak).toBe(1);
    expect(res.body.stat_date).toBe(statDate());
    expect(res.body.new_badges).toEqual([]);
    const r = row<{ photo_path: string }>(
      "SELECT * FROM checkins WHERE user_id=(SELECT id FROM users WHERE device_id='dev-1')"
    );
    expect(r.photo_path).toMatch(/^\/uploads\/.+\.png$/);
  });

  it("连续两天打卡 streak=2；当日重复打卡不重复计数", async () => {
    await post();
    // 直接补一条昨日打卡
    db.prepare("INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c-y', ?, 'RC_SC_002', 4, ?, ?)")
      .run(uid(), addDays(statDate(), -1), nowIso());
    const second = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_003").field("rating", "4");
    expect(second.body.streak).toBe(2);
  });

  it("rating 越界 400；recipe 不存在 404", async () => {
    const bad = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "9");
    expect(bad.status).toBe(400);
    const missing = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "NOPE").field("rating", "5");
    expect(missing.status).toBe(404);
  });

  it("非图片类型 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "5")
      .attach("photo", Buffer.from("not an image"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("照片超过 5MB → 422 PHOTO_TOO_LARGE", async () => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1024, 1);
    const res = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "5")
      .attach("photo", big, { filename: "big.png", contentType: "image/png" });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("PHOTO_TOO_LARGE");
  });

  it("第 10 道快手菜打卡解锁 fast_cook 徽章", async () => {
    const fast = ["RC_YU_001", "RC_YU_003", "RC_YU_005", "RC_JP_005", "RC_TH_003", "RC_TH_006", "RC_IN_006", "RC_IT_001", "RC_IT_003"];
    fast.forEach((id, i) => db.prepare(
      "INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES (?, ?, ?, 5, ?, ?)"
    ).run(`c${i}`, uid(), id, addDays(statDate(), -1), nowIso()));
    const res = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_GR_001").field("rating", "5");
    expect(res.body.new_badges.map((b: any) => b.id)).toContain("fast_cook");
  });
});

describe("GET /api/profile/summary", () => {
  it("返回 streak/日历/大洲探索/待补打卡/历史", async () => {
    db.prepare("INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c1', ?, 'RC_SC_001', 5, ?, ?)")
      .run(uid(), statDate(), nowIso());
    db.prepare("INSERT INTO spin_history (user_id, recipe_id, source, action, created_at) VALUES (?, 'RC_SC_002', 'all', 'spin', ?)")
      .run(uid(), nowIso());

    const res = await request(app).get("/api/profile/summary").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.streak.current).toBe(1);
    expect(res.body.calendar).toContain(statDate());
    expect(res.body.continents[0]).toMatchObject({ name: "亚洲" });
    expect(res.body.history[0]).toMatchObject({ recipe_id: "RC_SC_001", name: "麻婆豆腐" });
    expect(res.body.pending_checkin).toMatchObject({ recipe_id: "RC_SC_002" });
  });
});

describe("GET /api/badges + PATCH settings + POST events", () => {
  it("badges 列表 8 枚", async () => {
    const res = await request(app).get("/api/badges").set(DEV);
    expect(res.body.badges.length).toBe(8);
  });

  it("settings 合并保存", async () => {
    const res = await request(app).patch("/api/profile/settings").set(DEV)
      .send({ difficulty_pref: "easy" });
    expect(res.body.settings.difficulty_pref).toBe("easy");
  });

  it("events 接受 sendBeacon 形态（body.device_id）并入库", async () => {
    const res = await request(app).post("/api/events")
      .send({ event_id: "roulette_spin_click", device_id: "dev-1", params: { source: "all" } });
    expect(res.status).toBe(202);
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM events WHERE event_id='roulette_spin_click'").n).toBe(1);
  });

  it("events 未知事件 400", async () => {
    const res = await request(app).post("/api/events").send({ event_id: "unknown", device_id: "dev-1" });
    expect(res.status).toBe(400);
  });
});
