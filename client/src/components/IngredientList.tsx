import { useState } from "react";

/** 一人份原材料清单：勾选即划线，方便照单采买时逐项核对。 */
export function IngredientList({ items }: { items: { name: string; amount: string }[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  return (
    <ul className="divide-y divide-neutral-100" data-testid="ingredient-list">
      {items.map((it, i) => {
        const on = checked.has(i);
        return (
          <li key={`${it.name}-${i}`}>
            <label className="flex cursor-pointer items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  })
                }
                className="h-4 w-4 accent-[#ff6b35]"
              />
              <span className={`flex-1 text-sm ${on ? "line-through text-neutral-400" : ""}`}>
                {it.name}
              </span>
              <span className={`text-xs ${on ? "text-neutral-300" : "text-neutral-500"}`}>
                {it.amount}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
