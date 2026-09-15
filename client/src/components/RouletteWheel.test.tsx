import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouletteWheel } from "./RouletteWheel";
import type { RecipeDTO } from "../api/types";

const mk = (id: string, name: string): RecipeDTO =>
  ({
    id, name, emoji: "🍜", name_en: id, cuisine_id: "sichuan", cuisine_path: "", image_path: null,
    kcal: 400, minutes: 20, difficulty: 2, taste_tags: [], ingredients: [], tools: [], steps: [],
    solo_tip: "", color_tag: "红",
  }) as RecipeDTO;

describe("RouletteWheel", () => {
  it("渲染全部候选扇区标签", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"].map((s) => mk(s, `菜${s}`));
    render(<RouletteWheel candidates={candidates} spinning={false} resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByText("菜a")).toBeInTheDocument();
    expect(screen.getByText("菜f")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeInTheDocument();
  });

  it("无候选时 GO 按钮禁用", () => {
    render(<RouletteWheel candidates={[]} spinning={false} resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeDisabled();
  });

  it("转动中 GO 按钮禁用", () => {
    const candidates = ["a", "b"].map((s) => mk(s, `菜${s}`));
    render(<RouletteWheel candidates={candidates} spinning resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeDisabled();
  });
});
