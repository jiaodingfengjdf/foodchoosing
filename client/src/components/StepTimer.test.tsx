import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { StepTimer } from "./StepTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("StepTimer", () => {
  it("倒计时递减并归零提示", async () => {
    render(<StepTimer seconds={3} label="煎制" onClose={vi.fn()} />);
    expect(screen.getByText(/03/)).toBeInTheDocument();
    // React 18 下非 act 内的定时器回调不会同步刷进 DOM，必须包 act
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    expect(screen.getByText("时间到")).toBeInTheDocument();
  });

  it("点击关闭触发 onClose", () => {
    const onClose = vi.fn();
    render(<StepTimer seconds={60} label="焖" onClose={onClose} />);
    // 注意：fake timers 下 userEvent 的内部 delay 会与伪定时器互相等待导致用例挂起（实测 5s 超时）。
    // 本用例只验证回调触发，用同步的 fireEvent 即可，无需引入 userEvent。
    fireEvent.click(screen.getByRole("button", { name: /取消/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
