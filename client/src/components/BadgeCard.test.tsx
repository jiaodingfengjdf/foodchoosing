import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeCard } from "./BadgeCard";
import type { BadgeView } from "../api/types";

const base = {
  id: "eu_first", name: "初涉欧陆", description: "累计完成 3 道不同的欧洲菜品", icon: "🏰",
  category: "world", rule_type: "cuisine_continent_count",
} as const;

describe("BadgeCard", () => {
  it("未解锁：灰度 + 进度", () => {
    render(<BadgeCard badge={{ ...base, current: 1, target: 3, unlocked: false, unlocked_at: null } as BadgeView} />);
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByTestId("badge-card")).toHaveClass("grayscale");
  });

  it("已解锁：彩色 + 日期", () => {
    render(<BadgeCard badge={{ ...base, current: 3, target: 3, unlocked: true, unlocked_at: "2026-09-13T10:00:00.000Z" } as BadgeView} />);
    expect(screen.getByTestId("badge-card")).not.toHaveClass("grayscale");
    expect(screen.getByText(/2026-09-13/)).toBeInTheDocument();
  });
});
