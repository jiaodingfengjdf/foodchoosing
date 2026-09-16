import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueCheckin, pendingCheckins, removeCheckin, replayCheckins } from "./offlineQueue";

// 注意：不要传第三个参数 { virtual: false }——本仓库 vitest 2.1 的 vi.mock 类型只接受 1-2 个参数，
// 且 "./api" 是真实模块，默认无需 virtual。
vi.mock("./api", () => ({ apiForm: vi.fn() }));

beforeEach(() => localStorage.clear());

describe("offlineQueue", () => {
  it("入队/查询/移除", () => {
    enqueueCheckin({ recipe_id: "RC_SC_001", rating: 5 });
    expect(pendingCheckins().length).toBe(1);
    removeCheckin(pendingCheckins()[0].id);
    expect(pendingCheckins().length).toBe(0);
  });

  it("replay 逐条上传成功后清空，失败保留", async () => {
    const { apiForm } = await import("./api");
    (apiForm as any).mockResolvedValueOnce({ checkin_id: "CK1" }).mockRejectedValueOnce(new Error("network"));
    enqueueCheckin({ recipe_id: "a", rating: 5 });
    enqueueCheckin({ recipe_id: "b", rating: 4 });
    await replayCheckins();
    expect((apiForm as any).mock.calls.length).toBe(2); // 第二条失败后停止
    expect(pendingCheckins().length).toBe(1);
    expect(pendingCheckins()[0].recipe_id).toBe("b");
  });

  it("损坏的本地数据不影响读取", () => {
    localStorage.setItem("wte_pending_checkins", "{ 不是 JSON");
    expect(pendingCheckins()).toEqual([]);
  });
});
