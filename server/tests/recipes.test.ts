import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes, RECIPE_SEEDS, ORIGINAL_RECIPE_SEEDS, COLOR_TAGS } from "../src/seed/recipes";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); seedAll(db); });

/** better-sqlite3 的 get() 返回 unknown，需显式断言行形态 */
const row = <T>(sql: string, ...params: unknown[]): T => db.prepare(sql).get(...params) as T;

const PER_CUISINE: Record<string, number> = {
  sichuan: 6, yuecai: 6, kansai: 5, "thai-north": 6, "north-indian": 6,
  toscana: 6, provence: 6, oaxaca: 6, crete: 4, lima: 4,
};

describe("recipe dataset", () => {
  it("共 55 道且各菜系数量符合设计（crete/lima <6 用于验证并池）", () => {
    expect(RECIPE_SEEDS.length).toBeGreaterThanOrEqual(200);
    expect(ORIGINAL_RECIPE_SEEDS.length).toBe(55);
    for (const [cid, n] of Object.entries(PER_CUISINE)) {
      expect(ORIGINAL_RECIPE_SEEDS.filter((r) => r.cuisineId === cid).length).toBe(n);
    }
  });

  it("每道菜字段完整且取值合法", () => {
    for (const r of ORIGINAL_RECIPE_SEEDS) {
      expect(r.name.length, r.id).toBeGreaterThan(1);
      expect(r.nameEn.length, r.id).toBeGreaterThan(1);
      expect(r.emoji.length, r.id).toBeGreaterThan(0);
      expect(r.kcal, r.id).toBeGreaterThanOrEqual(150);
      expect(r.kcal, r.id).toBeLessThanOrEqual(1200);
      expect(r.minutes, r.id).toBeGreaterThanOrEqual(5);
      expect(r.minutes, r.id).toBeLessThanOrEqual(90);
      expect(r.difficulty, r.id).toBeGreaterThanOrEqual(1);
      expect(r.difficulty, r.id).toBeLessThanOrEqual(5);
      expect(COLOR_TAGS as readonly string[], r.id).toContain(r.colorTag);
      expect(r.tasteTags.length, r.id).toBeGreaterThan(0);
      expect(r.ingredients.length, r.id).toBeGreaterThanOrEqual(4);
      for (const ing of r.ingredients) {
        expect(ing.name.length, r.id).toBeGreaterThan(0);
        expect(ing.amount.length, r.id).toBeGreaterThan(0); // 一人份用量必有单位
      }
      expect(r.tools.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(4);
      for (const s of r.steps) {
        expect(s.text.length, r.id).toBeGreaterThanOrEqual(10);
        if (/\d+\s*(分钟|秒)/.test(s.text)) expect(s.seconds, r.id).toBeDefined(); // 时间词必须配计时秒数
      }
      expect(r.soloTip.length, r.id).toBeGreaterThanOrEqual(10);
    }
  });

  it("id 唯一且菜系均存在；seed 后可按菜系查询", () => {
    const ids = RECIPE_SEEDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(RECIPE_SEEDS.length);
    seedRecipes(db);
    const n = row<{ n: number }>("SELECT COUNT(*) AS n FROM recipes").n;
    expect(n).toBe(RECIPE_SEEDS.length);
    const sichuan = row<{ n: number }>(
      "SELECT COUNT(*) AS n FROM recipes r JOIN cuisines c ON r.cuisine_id=c.id WHERE c.id='sichuan'"
    ).n;
    expect(sichuan).toBeGreaterThanOrEqual(6);
  });

  it("幂等：重复 seed 行数不变", () => {
    seedRecipes(db);
    seedRecipes(db);
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM recipes").n).toBe(RECIPE_SEEDS.length);
  });
});
