import { addDays } from "../util/dates";

export interface StreakInfo {
  current: number;
  max: number;
  todayChecked: boolean;
}

/** 纯函数：入参日期需为 YYYY-MM-DD（04:00 归属日口径），内部去重排序。 */
function maxRun(sorted: string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/**
 * current 语义：连续段延伸到 today（今天已打卡）或 addDays(today,-1)
 * （昨天打卡、今天还没打，视为连击未断），否则为 0。
 */
export function computeStreak(dates: string[], today: string): StreakInfo {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { current: 0, max: 0, todayChecked: false };

  const last = unique[unique.length - 1];
  let current = 0;
  if (last === today || last === addDays(today, -1)) {
    current = 1;
    for (let i = unique.length - 1; i > 0; i--) {
      if (addDays(unique[i - 1], 1) === unique[i]) current++;
      else break;
    }
  }
  return { current, max: maxRun(unique), todayChecked: unique.includes(today) };
}
