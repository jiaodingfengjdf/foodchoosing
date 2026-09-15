import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SpinResultModal } from "./SpinResultModal";
import type { SpinResponse } from "../api/types";

vi.mock("../lib/api", () => ({ track: vi.fn() }));

const data = (over: Partial<SpinResponse> = {}): SpinResponse =>
  ({
    result: {
      id: "RC_SC_001", cuisine_id: "sichuan", cuisine_path: "亚洲 > 东亚 > 中国 > 川菜",
      name: "麻婆豆腐", name_en: "Mapo Tofu", emoji: "🌶️", image_path: null, kcal: 420,
      minutes: 20, difficulty: 2, taste_tags: ["麻辣"], ingredients: [], tools: [], steps: [],
      solo_tip: "", color_tag: "红",
    },
    candidates: [],
    pooled_up: null,
    reroll_left: 2,
    ...over,
  }) as SpinResponse;

const renderModal = (props: Partial<Parameters<typeof SpinResultModal>[0]> = {}) =>
  render(
    <MemoryRouter>
      <SpinResultModal
        data={data()}
        onClose={vi.fn()}
        onReroll={vi.fn()}
        rerolling={false}
        {...props}
      />
    </MemoryRouter>
  );

describe("SpinResultModal", () => {
  it("展示中奖菜品与元信息", () => {
    renderModal();
    expect(screen.getByText("麻婆豆腐")).toBeInTheDocument();
    expect(screen.getByText(/川菜/)).toBeInTheDocument();
  });

  it("并池提示横幅", () => {
    renderModal({ data: data({ pooled_up: "当前细分风味收录菜品较少，已自动整合南欧经典菜品一同入池" }) });
    expect(screen.getByText(/已自动整合/)).toBeInTheDocument();
  });

  it("重转次数用完置灰并提示", () => {
    renderModal({ data: data({ reroll_left: 0 }) });
    const btn = screen.getByRole("button", { name: /换一个/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/今日挑食机会已用完/)).toBeInTheDocument();
  });

  it("点击换一个触发 onReroll", async () => {
    const user = userEvent.setup();
    const onReroll = vi.fn();
    renderModal({ onReroll });
    await user.click(screen.getByRole("button", { name: /换一个/ }));
    expect(onReroll).toHaveBeenCalled();
  });
});
