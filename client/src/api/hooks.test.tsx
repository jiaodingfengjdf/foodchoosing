import { afterEach, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, onlineManager } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useRecipe, useSpin } from "./hooks";
import { api } from "../lib/api";
import { useAppStore } from "../stores/useAppStore";
import type { RecipeDTO } from "./types";

vi.mock("../lib/api", () => ({ api: vi.fn(), apiForm: vi.fn() }));
afterEach(() => {
  onlineManager.setOnline(true);
  useAppStore.setState({ lastCandidates: null });
  vi.clearAllMocks();
});

it("断网时执行转盘请求并触发降级回调，不暂停等待联网", async () => {
  onlineManager.setOnline(false);
  vi.mocked(api).mockRejectedValueOnce(new TypeError("Failed to fetch"));
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => useSpin(), { wrapper });
  const onError = vi.fn();
  act(() => result.current.mutate({ cuisine_id: null, source: "all" }, { onError }));
  await waitFor(() => expect(onError).toHaveBeenCalledOnce());
  expect(result.current.isPaused).toBe(false);
  unmount();
  client.clear();
});

it("断网时能查看缓存中的食谱，联网后更新为服务端数据", async () => {
  onlineManager.setOnline(false);
  const recipe = { id: "cached", name: "缓存食谱", steps: [] } as unknown as RecipeDTO;
  useAppStore.setState({ lastCandidates: [recipe] });
  vi.mocked(api).mockResolvedValueOnce({ recipe: { ...recipe, is_favorite: true } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = renderHook(() => useRecipe(recipe.id), { wrapper });
  expect(result.current.data?.recipe).toEqual(recipe);
  expect(result.current.isLoading).toBe(false);
  expect(api).not.toHaveBeenCalled();
  act(() => onlineManager.setOnline(true));
  await waitFor(() => expect(result.current.data?.recipe.is_favorite).toBe(true));
  unmount();
  client.clear();
});
