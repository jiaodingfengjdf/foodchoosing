import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CuisinePicker } from "./CuisinePicker";
import { useAppStore } from "../stores/useAppStore";

vi.mock("../lib/api", () => ({ track: vi.fn(), api: vi.fn(), apiForm: vi.fn() }));
vi.mock("../api/hooks", async () => {
  const actual = await vi.importActual<typeof import("../api/hooks")>("../api/hooks");
  return {
    ...actual,
    useCuisineTree: () => ({
      data: {
        nodes: [
          { id: "asia", level: 1, parent_id: null, name: "亚洲", name_en: "Asia", tags: [], dish_count: 0 },
          { id: "east-asia", level: 2, parent_id: "asia", name: "东亚", name_en: "East Asia", tags: [], dish_count: 0 },
          { id: "china", level: 3, parent_id: "east-asia", name: "中国", name_en: "China", tags: [], dish_count: 0 },
          { id: "sichuan", level: 4, parent_id: "china", name: "川菜", name_en: "Sichuan", tags: [], dish_count: 6 },
        ],
      },
    }),
  };
});

const renderPicker = () => {
  const qc = new QueryClient();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <CuisinePicker open onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose };
};

describe("CuisinePicker", () => {
  it("四级下钻后确认并回写 store", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();
    await user.click(screen.getByRole("button", { name: /亚洲/ }));
    await user.click(screen.getByRole("button", { name: /东亚/ }));
    await user.click(screen.getByRole("button", { name: /中国/ }));
    await user.click(screen.getByRole("button", { name: /川菜/ }));
    expect(useAppStore.getState().cuisineId).toBe("sichuan");
    expect(useAppStore.getState().cuisineLabel).toBe("亚洲 > 东亚 > 中国 > 川菜");
    expect(onClose).toHaveBeenCalled();
  });

  it("全球大乱斗快捷项置空选择", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();
    // 顶部说明文案里也含「全球大乱斗」字样，故按 role=button 定位，避免匹配到 header 的 div
    await user.click(screen.getByRole("button", { name: /全球大乱斗/ }));
    expect(useAppStore.getState().cuisineId).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
