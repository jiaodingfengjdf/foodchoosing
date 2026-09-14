import { describe, it, expect } from "vitest";
import { computeStreak } from "../src/services/streak";
import { addDays } from "../src/util/dates";

const T = "2026-09-13";
const d = (n: number) => addDays(T, -n);

describe("computeStreak", () => {
  it("空记录全 0", () => {
    expect(computeStreak([], T)).toEqual({ current: 0, max: 0, todayChecked: false });
  });

  it("今天首次打卡 current=1", () => {
    expect(computeStreak([T], T)).toEqual({ current: 1, max: 1, todayChecked: true });
  });

  it("昨天连续 3 天 + 今天打卡 → current=4", () => {
    expect(computeStreak([d(3), d(2), d(1), T], T)).toEqual({ current: 4, max: 4, todayChecked: true });
  });

  it("昨天打卡今天未打 → 连击未断 current=3", () => {
    expect(computeStreak([d(3), d(2), d(1)], T)).toEqual({ current: 3, max: 3, todayChecked: false });
  });

  it("前天打卡今天未打 → 断签 current=0", () => {
    expect(computeStreak([d(2)], T)).toEqual({ current: 0, max: 1, todayChecked: false });
  });

  it("历史最长与当前独立（曾连 5 天中断后重新开始）", () => {
    const old = [d(20), d(19), d(18), d(17), d(16)];
    expect(computeStreak([...old, d(1), T], T)).toEqual({ current: 2, max: 5, todayChecked: true });
  });

  it("重复日期不影响结果", () => {
    expect(computeStreak([T, T, d(1), d(1)], T)).toEqual({ current: 2, max: 2, todayChecked: true });
  });
});
