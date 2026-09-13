import { describe, it, expect } from "vitest";
import { statDate, addDays, nowIso } from "../src/util/dates";

describe("statDate（04:00 归属日界线）", () => {
  it("白天正常日期不变", () => {
    expect(statDate(new Date(2026, 8, 13, 12, 0))).toBe("2026-09-13");
  });
  it("凌晨 02:00 计入前一日", () => {
    expect(statDate(new Date(2026, 8, 13, 2, 0))).toBe("2026-09-12");
  });
  it("凌晨 04:00 起算新一日", () => {
    expect(statDate(new Date(2026, 8, 13, 4, 0))).toBe("2026-09-13");
  });
  it("03:59:59 仍计入前一日", () => {
    expect(statDate(new Date(2026, 8, 13, 3, 59, 59))).toBe("2026-09-12");
  });
  it("跨月边界：9月1日 02:00 计入 8月31日", () => {
    expect(statDate(new Date(2026, 8, 1, 2, 0))).toBe("2026-08-31");
  });
});

describe("addDays", () => {
  it("跨月", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
  it("跨年与零偏移", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2026-09-13", 0)).toBe("2026-09-13");
  });
});

describe("nowIso", () => {
  it("返回可被 Date 解析的 ISO 字符串", () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });
});
