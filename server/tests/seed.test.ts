import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll, CUISINES, BADGES } from "../src/seed";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); });

/** better-sqlite3 的 get() 返回 unknown，需显式断言行形态 */
const row = <T>(sql: string, ...params: unknown[]): T => db.prepare(sql).get(...params) as T;

describe("seedAll", () => {
  it("写入覆盖六大洲的四级菜系树", () => {
    seedAll(db);
    const byLevel = (l: number) =>
      row<{ n: number }>("SELECT COUNT(*) AS n FROM cuisines WHERE level=?", l).n;
    expect(byLevel(1)).toBe(6);
    expect(byLevel(2)).toBeGreaterThanOrEqual(15);
    expect(byLevel(3)).toBeGreaterThanOrEqual(33);
    expect(byLevel(4)).toBeGreaterThanOrEqual(60);
  });

  it("菜系父子关系与标签正确", () => {
    seedAll(db);
    const crete = row<any>("SELECT * FROM cuisines WHERE id='crete'");
    expect(crete.parent_id).toBe("greece");
    expect(JSON.parse(crete.tags)).toContain("mediterranean");
    const oaxaca = row<any>("SELECT * FROM cuisines WHERE id='oaxaca'");
    expect(JSON.parse(oaxaca.tags)).toContain("latam");
  });

  it("写入 8 枚徽章且幂等（重复 seed 行数不变）", () => {
    seedAll(db);
    seedAll(db);
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM badge_defs").n).toBe(BADGES.length);
    expect(row<{ n: number }>("SELECT COUNT(*) AS n FROM cuisines").n).toBe(CUISINES.length);
  });
});
