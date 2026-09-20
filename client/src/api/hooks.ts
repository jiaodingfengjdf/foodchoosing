import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiForm } from "../lib/api";
import { useAppStore } from "../stores/useAppStore";
import type {
  BadgeView,
  CheckinResponse,
  CuisineNode,
  DifficultyPref,
  FavoriteItem,
  ProfileSummary,
  RecipeDTO,
  SpinResponse,
  SpinSource,
} from "./types";

interface SpinBody {
  cuisine_id: string | null;
  source: SpinSource;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

export function useCuisineTree() {
  return useQuery({
    queryKey: ["cuisines"],
    queryFn: () => api<{ nodes: CuisineNode[] }>("/api/cuisines/tree"),
    staleTime: Infinity,
  });
}

export function useSpin() {
  return useMutation({
    // 必须执行请求并触发失败回调，才能进入 HomePage 的缓存抽菜逻辑。
    networkMode: "always",
    mutationFn: (body: SpinBody) => api<SpinResponse>("/api/spin", jsonInit("POST", body)),
  });
}

export function useReroll() {
  return useMutation({
    mutationFn: (body: SpinBody) => api<SpinResponse>("/api/spin/reroll", jsonInit("POST", body)),
  });
}

export function useRecipe(id: string | undefined) {
  const cached = useAppStore((state) => state.lastCandidates?.find((recipe) => recipe.id === id));
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api<{ recipe: RecipeDTO }>(`/api/recipes/${id}`),
    enabled: !!id,
    // 转盘缓存含完整做法，断网时也能进入详情；联网请求仍会更新收藏等状态。
    placeholderData: cached ? { recipe: cached } : undefined,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api<{ items: FavoriteItem[] }>("/api/favorites"),
  });
}

export function useFavoriteToggle(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) =>
      next
        ? api<{ ok: true }>("/api/favorites", jsonInit("POST", { recipe_id: recipeId }))
        : api<{ ok: true }>(`/api/favorites/${recipeId}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      void qc.invalidateQueries({ queryKey: ["recipe", recipeId] });
    },
  });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => apiForm<CheckinResponse>("/api/checkins", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["badges"] });
    },
  });
}

export function useBadges() {
  return useQuery({
    queryKey: ["badges"],
    queryFn: () => api<{ badges: BadgeView[] }>("/api/badges"),
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api<ProfileSummary>("/api/profile/summary"),
  });
}

export function useSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { difficulty_pref: DifficultyPref }) =>
      api<{ settings: Record<string, unknown> }>("/api/profile/settings", jsonInit("PATCH", body)),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
