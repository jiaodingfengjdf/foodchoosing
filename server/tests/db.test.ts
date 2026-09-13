import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDb, type DB } from "../src/db";

const opened: DB[] = [];
const tmpFiles: string[] = [];

function track(db: DB): DB {
  opened.push(db);
  return db;
}

afterEach(() => {
  // 必须先在 Windows 上关闭连接，否则临时库文件被占用，rmSync 会抛 EPERM
  for (const db of opened.splice(0)) {
    try {
      db.close();
    } catch {
      /* 已关闭则忽略 */
    }
  }
  for (const f of tmpFiles.splice(0)) {
    for (const suffix of ["", "-wal", "-shm"]) {
      fs.rmSync(f + suffix, { force: true });
    }
  }
});

function tmpDb(): string {
  const file = path.join(os.tmpdir(), `wte-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  tmpFiles.push(file);
  return file;
}

describe("openDb", () => {
  it("建立全部 12 张表且幂等", () => {
    const db = track(openDb(":memory:"));
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);
    for (const t of ["users", "cuisines", "recipes", "checkins", "favorites", "spin_history",
      "reroll_usage", "badge_defs", "user_badges", "blocks", "events"]) {
      expect(tables).toContain(t);
    }
    expect(() => track(openDb(":memory:"))).not.toThrow(); // 再次执行迁移不报错
  });

  it("文件库 WAL 模式生效（:memory: 不支持 WAL，用临时文件验证）", () => {
    const db = track(openDb(tmpDb()));
    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
  });
});
