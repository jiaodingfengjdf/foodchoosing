import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FavoritesPage } from "./FavoritesPage";
import { useAppStore } from "../stores/useAppStore";

vi.mock("../lib/api", () => ({ api: vi.fn(), apiForm: vi.fn(), track: vi.fn() }));
vi.mock("../api/hooks", () => ({
  useFavorites: () => ({ data: { items: [
    { id: "RC_YU_003", name: "蒜蓉菜心", emoji: "🥬", minutes: 10, cuisine_path: "亚洲 > 东亚 > 中国 > 粤菜",
      continent: "亚洲", country: "中国", scene_tags: ["quick"], ingredients: [], tools: [], steps: [],
      taste_tags: [], solo_tip: "", color_tag: "绿", kcal: 180, difficulty: 1, name_en: "Choy Sum",
      image_path: null, cuisine_id: "yuecai", favorited_at: "2026-09-13" },
    { id: "RC_YU_004", name: "煲仔饭", emoji: "🍚", minutes: 45, cuisine_path: "亚洲 > 东亚 > 中国 > 粤菜",
      continent: "亚洲", country: "中国", scene_tags: ["weekend"], ingredients: [], tools: [], steps: [],
      taste_tags: [], solo_tip: "", color_tag: "棕", kcal: 680, difficulty: 3, name_en: "Claypot Rice",
      image_path: null, cuisine_id: "yuecai", favorited_at: "2026-09-13" },
  ] } }),
}));

describe("FavoritesPage", () => {
  it("渲染收藏并按场景筛选", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    expect(screen.getByText("蒜蓉菜心")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /15分钟速成/ }));
    expect(screen.queryByText("煲仔饭")).not.toBeInTheDocument();
  });

  it("收藏夹转盘开关切换数据源", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    await user.click(screen.getByTestId("source-switch"));
    expect(useAppStore.getState().source).toBe("favorites");
  });
});
