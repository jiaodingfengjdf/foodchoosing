import { describe, it, expect } from "vitest";
import { localPick } from "./localSpin";

describe("localPick", () => {
  it("从候选中取一", () => {
    const candidates = [{ id: "a" }, { id: "b" }, { id: "c" }] as any[];
    const picked = localPick(candidates)!;
    expect(candidates.map((c) => c.id)).toContain(picked.id);
  });

  it("空候选返回 null", () => {
    expect(localPick([])).toBeNull();
  });

  it("单候选时必然命中", () => {
    const only = [{ id: "solo" }] as any[];
    expect(localPick(only)!.id).toBe("solo");
  });

  it("原数组不被修改", () => {
    const candidates = [{ id: "a" }, { id: "b" }] as any[];
    localPick(candidates);
    expect(candidates.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
