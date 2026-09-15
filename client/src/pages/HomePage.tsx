import { useState } from "react";
import { CuisinePicker } from "../components/CuisinePicker";
import { useAppStore } from "../stores/useAppStore";

export function HomePage() {
  const { cuisineLabel, source } = useAppStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm"
        data-testid="cuisine-capsule"
      >
        <span className="truncate text-sm">
          {source === "favorites" ? "❤️ 收藏夹转盘" : cuisineLabel}
        </span>
        <span className="text-xs text-neutral-400">切换 ▾</span>
      </button>

      <CuisinePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {/* RouletteWheel 于 Task 14 接入 */}
      <div className="py-20 text-center text-neutral-400" data-testid="wheel-placeholder">
        转盘区域
      </div>
    </div>
  );
}
