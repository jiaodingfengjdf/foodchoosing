import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./useAppStore";
import type { RecipeDTO } from "../api/types";

beforeEach(() =>
  useAppStore.setState({ cuisineId: null, cuisineLabel: "全球大乱斗", source: "all", lastCandidates: null })
);

describe("useAppStore", () => {
  it("setCuisine 更新选择并记忆", () => {
    useAppStore.getState().setCuisine("sicily", "欧洲 > 意大利 > 西西里菜");
    const s = useAppStore.getState();
    expect(s.cuisineId).toBe("sicily");
    expect(s.cuisineLabel).toContain("西西里");
  });

  it("setSource 切换收藏夹数据源", () => {
    useAppStore.getState().setSource("favorites");
    expect(useAppStore.getState().source).toBe("favorites");
  });

  it("setLastCandidates 保存候选池供断网降级", () => {
    const candidates = [{ id: "RC_SC_001" }] as unknown as RecipeDTO[];
    useAppStore.getState().setLastCandidates(candidates);
    expect(useAppStore.getState().lastCandidates).toEqual(candidates);
  });
});
