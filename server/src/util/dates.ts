const HOUR = 3600 * 1000;

/** 统计日：当地时间减 4h 后的日期（凌晨 0-4 点计入前一日）。 */
export function statDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() - 4 * HOUR);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 在 YYYY-MM-DD 上加减天数，自动跨月跨年。 */
export function addDays(stat: string, delta: number): string {
  const [y, m, d] = stat.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
