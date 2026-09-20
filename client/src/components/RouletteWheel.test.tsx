import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouletteWheel, nextWheelRotation } from "./RouletteWheel";
import type { RecipeDTO } from "../api/types";

const mk = (id: string, name: string): RecipeDTO =>
  ({
    id, name, emoji: "🍜", name_en: id, cuisine_id: "sichuan", cuisine_path: "", image_path: null,
    kcal: 400, minutes: 20, difficulty: 2, taste_tags: [], ingredients: [], tools: [], steps: [],
    solo_tip: "", color_tag: "红",
  }) as RecipeDTO;

describe("RouletteWheel", () => {
  it("每个候选的扇区中心最终与顶部指针对齐", () => {
    for (const count of [1, 2, 6, 8]) for (let index = 0; index < count; index++) {
      const rotation = nextWheelRotation(2317, index, count);
      expect(rotation).toBeGreaterThanOrEqual(2317 + 1800);
      expect(((rotation + (index + 0.5) * 360 / count) % 360)).toBeCloseTo(0);
    }
  });
  it("渲染全部候选扇区标签", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"].map((s) => mk(s, `菜${s}`));
    render(<RouletteWheel candidates={candidates} spinning={false} resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByText("菜a")).toBeInTheDocument();
    expect(screen.getByText("菜f")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeInTheDocument();
  });

  it("无候选时 GO 按钮仍可用（否则首次进入无法发起第一次转动）", () => {
    render(<RouletteWheel candidates={[]} spinning={false} resultId={null} onSpinEnd={vi.fn()} />);
    const go = screen.getByRole("button", { name: /今天吃它/ });
    expect(go).toBeInTheDocument();
    expect(go).not.toBeDisabled();
  });

  it("转动中 GO 按钮禁用", () => {
    const candidates = ["a", "b"].map((s) => mk(s, `菜${s}`));
    render(<RouletteWheel candidates={candidates} spinning resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeDisabled();
  });

  it("无候选时点击 GO 仍会触发 onGo", async () => {
    const user = userEvent.setup();
    const onGo = vi.fn();
    render(<RouletteWheel candidates={[]} spinning={false} resultId={null} onSpinEnd={vi.fn()} onGo={onGo} />);
    await user.click(screen.getByRole("button", { name: /今天吃它/ }));
    expect(onGo).toHaveBeenCalled();
  });
});
