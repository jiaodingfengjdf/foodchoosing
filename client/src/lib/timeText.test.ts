import { describe, it, expect } from "vitest";
import { parseTimeSegments } from "./timeText";

describe("parseTimeSegments", () => {
  it("拆分普通文本与时间词", () => {
    const segs = parseTimeSegments("大火煎 3 分钟后翻面，再焖 90 秒");
    expect(segs).toEqual([
      { type: "text", value: "大火煎 " },
      { type: "timer", value: "3 分钟", seconds: 180 },
      { type: "text", value: "后翻面，再焖 " },
      { type: "timer", value: "90 秒", seconds: 90 },
    ]);
  });

  it("无时间词返回单段", () => {
    expect(parseTimeSegments("翻炒均匀")).toEqual([{ type: "text", value: "翻炒均匀" }]);
  });

  it("时间词在开头/结尾时不留空文本段", () => {
    expect(parseTimeSegments("5 分钟")).toEqual([{ type: "timer", value: "5 分钟", seconds: 300 }]);
    expect(parseTimeSegments("焖 5 分钟")).toEqual([
      { type: "text", value: "焖 " },
      { type: "timer", value: "5 分钟", seconds: 300 },
    ]);
  });

  it("纯秒数不换算为分钟", () => {
    expect(parseTimeSegments("焯 40 秒")).toEqual([
      { type: "text", value: "焯 " },
      { type: "timer", value: "40 秒", seconds: 40 },
    ]);
  });
});
