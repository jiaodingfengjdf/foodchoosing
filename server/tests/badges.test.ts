import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { badgeProgress, evaluateBadges, listBadgesForUser } from "../src/services/badges";
import { computeStreak } from "../src/services/streak";
import { statDate, addDays } from "../src/util/dates";

let db: DB;
let userId: string;
const TODAY = statDate();

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  userId = "u1";
  db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, 'dev-1', '2026-01-01')").run(userId);
});

const def = (id: string) => db.prepare("SELECT * FROM badge_defs WHERE id = ?").get(id) as any;

function checkin(recipeId: string, statDateStr: string = TODAY, createdAt: string = `${statDateStr}T22:00:00.000Z`) {
  db.prepare(
    "INSERT OR IGNORE INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES (?, ?, ?, 5, ?, ?)"
  ).run(`c-${recipeId}-${statDateStr}`, userId, recipeId, statDateStr, createdAt);
}

describe("badgeProgress / evaluateBadges", () => {
  it("eu_first：3 道不同欧洲菜解锁（欧洲 L1 祖先）", () => {
    checkin("RC_IT_001"); checkin("RC_IT_002"); checkin("RC_GR_001");
    expect(badgeProgress(db, userId, def("eu_first"))).toEqual({ current: 3, target: 3 });
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("eu_first");
    // 再判定不重复解锁
    expect(evaluateBadges(db, userId, new Date()).map((b: any) => b.id)).not.toContain("eu_first");
  });

  it("latam：墨西哥 + 南美（秘鲁）混合计数", () => {
    for (const id of ["RC_MX_001", "RC_MX_002", "RC_MX_003", "RC_PE_001", "RC_PE_003"]) checkin(id);
    expect(badgeProgress(db, userId, def("latam")).current).toBe(5);
  });

  it("mediterranean：tag=mediterranean 的菜系（普罗旺斯/克里特）", () => {
    for (const id of ["RC_FR_001", "RC_FR_002", "RC_FR_003", "RC_GR_001", "RC_GR_002", "RC_GR_003", "RC_FR_004"]) checkin(id);
    expect(badgeProgress(db, userId, def("mediterranean")).current).toBe(7);
  });

  it("solo_chef：current streak ≥ 7（用 streak 服务口径）", () => {
    for (let i = 6; i >= 0; i--) checkin(`RC_SC_00${i + 1}` === "RC_SC_007" ? "RC_SC_006" : `RC_SC_00${i + 1}`, addDays(TODAY, -i));
    // 7 天里每天一道不同菜
    const dates = db.prepare("SELECT stat_date FROM checkins WHERE user_id=?").all(userId).map((r: any) => r.stat_date);
    const streak = computeStreak(dates, TODAY);
    expect(streak.current).toBeGreaterThanOrEqual(7);
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("solo_chef");
  });

  it("fast_cook：去重 minutes≤15 达 10 道（重复打卡同一道不重复计）", () => {
    for (const id of ["RC_YU_001", "RC_YU_003", "RC_YU_005", "RC_JP_005", "RC_TH_003", "RC_TH_006", "RC_IN_006", "RC_IT_001", "RC_IT_003", "RC_GR_001", "RC_GR_003"]) checkin(id);
    checkin("RC_GR_003", addDays(TODAY, -1)); // 同一道再打卡，不增计数
    expect(badgeProgress(db, userId, def("fast_cook")).current).toBe(11);
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("fast_cook");
  });

  it("night_owl：created_at 本地小时 ≥21 计 3 次", () => {
    // 服务器本地时区（UTC+8 测试机）下 22:00Z 不一定 ≥21h —— 用本地 Date 构造
    const late = new Date(); late.setHours(22, 0, 0, 0);
    checkin("RC_SC_001", TODAY, late.toISOString());
    checkin("RC_SC_002", TODAY, late.toISOString());
    expect(badgeProgress(db, userId, def("night_owl")).current).toBe(2);
    checkin("RC_SC_003", TODAY, late.toISOString());
    expect(evaluateBadges(db, userId, late).map((b: any) => b.id)).toContain("night_owl");
  });

  it("color_master：5 种不同主色调", () => {
    for (const id of ["RC_SC_001", "RC_IT_003", "RC_TH_002", "RC_IT_002", "RC_MX_002"]) checkin(id);
    // 红白棕绿橙
    expect(badgeProgress(db, userId, def("color_master")).current).toBe(5);
    expect(evaluateBadges(db, userId, new Date()).map((b: any) => b.id)).toContain("color_master");
  });

  it("globe_master：进度 = 达标洲数，未达标不解锁", () => {
    for (const id of ["RC_SC_001", "RC_YU_001", "RC_JP_001", "RC_TH_001", "RC_IN_001"]) checkin(id);
    const p = badgeProgress(db, userId, def("globe_master"));
    expect(p.current).toBe(0); // 亚洲只有 4 个国家
    expect(p.target).toBe(5);
  });
});

describe("listBadgesForUser", () => {
  it("返回 8 枚，含进度与解锁状态", () => {
    checkin("RC_IT_001");
    const views = listBadgesForUser(db, userId);
    expect(views.length).toBe(8);
    const eu = views.find((v) => v.id === "eu_first")!;
    expect(eu.current).toBe(1);
    expect(eu.unlocked).toBe(false);
    expect(eu.unlocked_at).toBeNull();
  });
});
