export type Segment =
  | { type: "text"; value: string }
  | { type: "timer"; value: string; seconds: number };

const TIME_WORD = /(\d+)\s*(分钟|秒)/g;

/**
 * 把步骤文本按「N 分钟 / N 秒」切成文本段与计时段。
 * 步骤里出现的时间词对应 Task 4 数据契约里已备好的 seconds，前端据此提供一键计时。
 */
export function parseTimeSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TIME_WORD)) {
    const idx = m.index ?? 0;
    if (idx > last) segs.push({ type: "text", value: text.slice(last, idx) });
    const n = Number(m[1]);
    segs.push({ type: "timer", value: m[0], seconds: m[2] === "分钟" ? n * 60 : n });
    last = idx + m[0].length;
  }
  if (last < text.length) segs.push({ type: "text", value: text.slice(last) });
  return segs;
}
