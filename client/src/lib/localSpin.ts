import type { RecipeDTO } from "../api/types";

/**
 * 断网降级：从上次缓存的候选池里均匀随机取一道，保证「转盘决定今晚吃什么」这条核心链路不断。
 * 无缓存时返回 null，由调用方决定如何提示。
 */
export function localPick(candidates: RecipeDTO[]): RecipeDTO | null {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
