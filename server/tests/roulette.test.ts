import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { bucketize, sampleByRatio, spin, rerollSpin, buildPool } from "../src/services/roulette";
import { HttpError } from "../src/util/http";
import { addDays, nowIso, statDate } from "../src/util/dates";

let db: DB;
let userId: string;
/**
 * 必须用真实的 statDate()。注意 buildPool 的 today 参数是被刻意忽略的——
 * filterRecentlyServed 内部按 statDate() 算 7 天窗口（见 services/roulette.ts），
 * 所以若这里写死某个历史日期，打卡记录的 stat_date 会随真实时间推移滑出窗口，测试就假失败。
 */
const TODAY = statDate();

/** 断言抛出的是带指定 code/status 的 HttpError（message 为用户文案，故以 code 断言）。 */
function expectHttpError(fn: () => unknown, code: string, status: number): void {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    const err = e as HttpError;
    expect(err.code).toBe(code);
    expect(err.status).toBe(status);
    return;
  }
  throw new Error(`expected HttpError(${code}) but nothing was thrown`);
}

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  userId = "u1";
  db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, 'dev-1', ?)").run(userId, nowIso());
});

const mkRecipe = (id: string, minutes: number): any => ({
  id, cuisine_id: "sichuan", name: id, name_en: id, emoji: "🍜", image_path: null,
  kcal: 400, minutes, difficulty: 2, taste_tags: "[]", ingredients: "[]",
  tools: "[]", steps: "[]", solo_tip: "", color_tag: "红",
});

describe("bucketize", () => {
  it("easy ≤20 / medium 21-44 / hard ≥45", () => {
    const b = bucketize([mkRecipe("a", 20), mkRecipe("b", 21), mkRecipe("c", 44), mkRecipe("d", 45)]);
    expect(b.easy.map((r) => r.id)).toEqual(["a"]);
    expect(b.medium.map((r) => r.id)).toEqual(["b", "c"]);
    expect(b.hard.map((r) => r.id)).toEqual(["d"]);
  });
});

describe("sampleByRatio", () => {
  it("target=8 按配比 4/3/1 抽样", () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`e${i}`, 15)),
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`m${i}`, 30)),
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`h${i}`, 60)),
    ];
    const picked = sampleByRatio(pool, 8);
    expect(picked.length).toBe(8);
    expect(picked.filter((r) => r.minutes <= 20).length).toBe(4);
    expect(picked.filter((r) => r.minutes > 20 && r.minutes < 45).length).toBe(3);
    expect(picked.filter((r) => r.minutes >= 45).length).toBe(1);
    expect(new Set(picked.map((r) => r.id)).size).toBe(8); // 无重复
  });

  it("桶空时回退到其他桶", () => {
    const pool = Array.from({ length: 10 }, (_, i) => mkRecipe(`e${i}`, 15));
    const picked = sampleByRatio(pool, 6);
    expect(picked.length).toBe(6);
    expect(picked.every((r) => r.minutes <= 20)).toBe(true);
  });

  it("池小于 target 时返回全部", () => {
    const pool = [mkRecipe("a", 15), mkRecipe("b", 30)];
    expect(sampleByRatio(pool, 6).length).toBe(2);
  });
});

describe("buildPool", () => {
  it("克里特(4道)优先合并到已有足够菜谱的希腊，提示含父级名称", () => {
    const { pool, pooledUp } = buildPool(db, userId, "crete", "all", TODAY);
    expect(pool.length).toBeGreaterThanOrEqual(6);
    expect(pooledUp).toContain("希腊");
    expect(pool.every(r => ["crete", "greece-home"].includes(r.cuisine_id))).toBe(true);
  });

  it("过滤 7 天内已打卡菜品", () => {
    db.prepare(
      "INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c1', ?, 'RC_GR_001', 5, ?, ?)"
    ).run(userId, TODAY, nowIso());
    const { pool } = buildPool(db, userId, "crete", "all", TODAY);
    expect(pool.some((r) => r.id === "RC_GR_001")).toBe(false);
  });

  it("过滤拉黑中的菜品，过期拉黑不过滤", () => {
    // 拉黑判定是与真实 now 比较，故这里也必须用相对日期，否则到某天会翻车
    db.prepare(
      "INSERT INTO blocks (user_id, recipe_id, blocked_until) VALUES (?, 'RC_SC_001', ?)"
    ).run(userId, `${addDays(statDate(), 30)}T00:00:00.000Z`);
    let { pool } = buildPool(db, userId, "sichuan", "all", TODAY);
    expect(pool.some((r) => r.id === "RC_SC_001")).toBe(false);
    db.prepare("UPDATE blocks SET blocked_until=?").run(`${addDays(statDate(), -1)}T00:00:00.000Z`);
    ({ pool } = buildPool(db, userId, "sichuan", "all", TODAY));
    expect(pool.some((r) => r.id === "RC_SC_001")).toBe(true);
  });

  it("favorites 数据源只含收藏", () => {
    db.prepare("INSERT INTO favorites (user_id, recipe_id, created_at) VALUES (?, 'RC_SC_001', ?)").run(userId, nowIso());
    const { pool } = buildPool(db, userId, null, "favorites", TODAY);
    expect(pool.map((r) => r.id)).toEqual(["RC_SC_001"]);
  });
});

describe("spin / reroll", () => {
  it("同一用户连续转动不重复上一次结果", () => {
    const first = spin(db, userId, "sichuan", "all");
    const second = spin(db, userId, "sichuan", "all");
    expect(second.result.id).not.toBe(first.result.id);
  });
  it("重转失败不扣除次数", () => {
    expectHttpError(() => rerollSpin(db, userId, null, "favorites"), "EMPTY_POOL", 404);
    expect(db.prepare("SELECT * FROM reroll_usage WHERE user_id=?").get(userId)).toBeUndefined();
  });
  it("选择国家时只在该国家的子菜系内抽取", () => {
    const { pool, pooledUp } = buildPool(db, userId, "china", "all", TODAY);
    expect(pool.length).toBeGreaterThan(100);
    expect(pooledUp).toBeNull();
    expect(pool.every(r => !["kansai", "thai-north", "north-indian"].includes(r.cuisine_id))).toBe(true);
  });
  it("spin 返回 6-8 候选且 result 在候选中，写 spin_history", () => {
    const r = spin(db, userId, "sichuan", "all");
    expect(r.candidates.length).toBeGreaterThanOrEqual(6);
    expect(r.candidates.length).toBeLessThanOrEqual(8);
    expect(r.candidates.some((c) => c.id === r.result.id)).toBe(true);
    expect(r.pooledUp).toBeNull();
    expect(db.prepare("SELECT action FROM spin_history WHERE user_id=?").all(userId))
      .toContainEqual({ action: "spin" });
  });

  it("全球大乱斗：cuisineId=null 用全库", () => {
    const r = spin(db, userId, null, "all");
    expect(r.candidates.length).toBe(8);
  });

  it("重转每日 2 次，第 3 次 429", () => {
    rerollSpin(db, userId, "sichuan", "all");
    rerollSpin(db, userId, "sichuan", "all");
    expectHttpError(() => rerollSpin(db, userId, "sichuan", "all"), "REROLL_EXHAUSTED", 429);
    // 跨日重置
    const yesterday = addDays(TODAY, -1);
    db.prepare("UPDATE reroll_usage SET date=?").run(yesterday);
    expect(() => rerollSpin(db, userId, "sichuan", "all")).not.toThrow();
  });
});
