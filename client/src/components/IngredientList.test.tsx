import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngredientList } from "./IngredientList";

describe("IngredientList", () => {
  it("勾选后条目划线", async () => {
    const user = userEvent.setup();
    render(<IngredientList items={[{ name: "嫩豆腐", amount: "300g" }]} />);
    const checkbox = screen.getByRole("checkbox");
    expect(screen.getByText("嫩豆腐")).not.toHaveClass("line-through");
    await user.click(checkbox);
    expect(screen.getByText("嫩豆腐")).toHaveClass("line-through");
  });

  it("再次点击取消划线", async () => {
    const user = userEvent.setup();
    render(<IngredientList items={[{ name: "嫩豆腐", amount: "300g" }]} />);
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    await user.click(checkbox);
    expect(screen.getByText("嫩豆腐")).not.toHaveClass("line-through");
  });

  it("多项互不干扰", async () => {
    const user = userEvent.setup();
    render(
      <IngredientList
        items={[
          { name: "嫩豆腐", amount: "300g" },
          { name: "牛肉末", amount: "50g" },
        ]}
      />
    );
    await user.click(screen.getAllByRole("checkbox")[0]);
    expect(screen.getByText("嫩豆腐")).toHaveClass("line-through");
    expect(screen.getByText("牛肉末")).not.toHaveClass("line-through");
  });
});
