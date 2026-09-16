import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DifficultyPref, RecipeDTO } from "../api/types";

export interface AppState {
  /** null = 全球大乱斗（全量库随机） */
  cuisineId: string | null;
  /** 如 "欧洲 > 意大利 > 西西里菜" 或 "全球大乱斗" */
  cuisineLabel: string;
  /** 转盘数据源 */
  source: "all" | "favorites";
  /** 最近一次转盘候选池，供断网降级使用 */
  lastCandidates: RecipeDTO[] | null;
  /**
   * 难度偏好。服务端也会存一份（users.settings），但 /api/profile/summary 不返回 settings，
   * 前端本地留一份才能让设置项的选中态在刷新后仍然正确。
   */
  difficultyPref: DifficultyPref;
  setCuisine: (id: string | null, label: string) => void;
  setSource: (s: "all" | "favorites") => void;
  setLastCandidates: (c: RecipeDTO[]) => void;
  setDifficultyPref: (p: DifficultyPref) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      cuisineId: null,
      cuisineLabel: "全球大乱斗",
      source: "all",
      lastCandidates: null,
      difficultyPref: null,
      setCuisine: (cuisineId, cuisineLabel) => set({ cuisineId, cuisineLabel }),
      setSource: (source) => set({ source }),
      setLastCandidates: (lastCandidates) => set({ lastCandidates }),
      setDifficultyPref: (difficultyPref) => set({ difficultyPref }),
    }),
    { name: "wte-app" }
  )
);
