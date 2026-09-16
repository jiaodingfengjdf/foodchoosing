import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckinModal } from "./CheckinModal";
import type { RecipeDTO } from "../api/types";

// 注意：mutate 必须真的回调 onSuccess，否则「提交成功」这条路径永远走不到（计划原文的 no-op mock 会 5s 超时）
vi.mock("../api/hooks", () => ({
  useCheckin: () => ({
    mutate: (_form: FormData, opts?: { onSuccess?: (r: unknown) => void }) =>
      opts?.onSuccess?.({
        checkin_id: "CK1",
        streak: 3,
        max_streak: 3,
        stat_date: "2026-09-15",
        new_badges: [],
      }),
    isPending: false,
  }),
}));
vi.mock("../lib/api", () => ({ track: vi.fn() }));
vi.mock("../lib/imageCompress", () => ({ compressImage: vi.fn().mockResolvedValue(new Blob()) }));
vi.mock("../lib/confetti", () => ({ fireConfetti: vi.fn() }));

const recipe = { id: "RC_SC_001", name: "麻婆豆腐", emoji: "🌶️" } as RecipeDTO;

describe("CheckinModal", () => {
  it("未选星级时提交禁用", () => {
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByRole("button", { name: /打卡/ })).toBeDisabled();
  });

  it("选星提交走 useCheckin.mutate", async () => {
    const user = userEvent.setup();
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await user.click(screen.getByTestId("star-4"));
    await user.click(screen.getByRole("button", { name: /打卡/ }));
    await waitFor(() => expect(screen.getByTestId("checkin-success")).toBeInTheDocument());
  });

  it("提交成功回调 onSuccess 并展示连续天数", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={onSuccess} />);
    await user.click(screen.getByTestId("star-5"));
    await user.click(screen.getByRole("button", { name: /打卡/ }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(screen.getByText(/连续 3 天/)).toBeInTheDocument();
  });

  it("短评超过 100 字被截断", () => {
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const ta = screen.getByLabelText(/心得/) as HTMLTextAreaElement;
    expect(ta.maxLength).toBe(100);
  });
});
