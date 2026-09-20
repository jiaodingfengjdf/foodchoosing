import { useNavigate } from "react-router-dom";
import type { SpinResponse } from "../api/types";
import { track } from "../lib/api";
import { DishPhoto } from "./DishPhoto";

export function SpinResultModal({ data, onClose, onReroll, rerolling, offline = false }: {
  data: SpinResponse;
  onClose: () => void;
  onReroll: () => void;
  rerolling: boolean;
  offline?: boolean;
}) {
  const navigate = useNavigate();
  const { result } = data;
  const exhausted = data.reroll_left <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
      data-testid="spin-result-modal"
    >
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
        {offline && (
          <div className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
            当前离线，已用缓存菜单本地抽奖
          </div>
        )}

        {data.pooled_up && (
          <div
            className="mb-3 rounded bg-sky-50 px-2 py-1.5 text-xs text-sky-600"
            data-testid="pooled-up-banner"
          >
            {data.pooled_up}
          </div>
        )}

        <DishPhoto src={result.image_path} name={result.name} className="mb-3 h-40 w-full rounded-2xl" />
        <h2 className="mt-2 text-xl font-bold">{result.name}</h2>
        <p className="text-xs text-neutral-400">
          {result.name_en} · {result.cuisine_path}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          约 {result.minutes} 分钟 · {"★".repeat(result.difficulty)}
        </p>

        <div className="mt-5 space-y-2">
          <button
            className="w-full rounded-full bg-brand-500 py-3 font-medium text-white"
            onClick={() => {
              track("roulette_result_action", { recipe_id: result.id, action_type: "view_recipe" });
              navigate(`/recipe/${result.id}`);
            }}
          >
            查看食谱
          </button>

          <button
            className="w-full rounded-full border border-neutral-200 py-3 text-neutral-600 disabled:opacity-40"
            disabled={exhausted || rerolling}
            onClick={() => {
              track("roulette_result_action", { recipe_id: result.id, action_type: "reroll" });
              onReroll();
            }}
          >
            不合胃口，换一个{!exhausted && `（剩 ${data.reroll_left} 次）`}
          </button>

          {exhausted && (
            <p className="text-xs text-neutral-400">
              今日挑食机会已用完，勇敢尝试一下吧！或手动切换其他菜系
            </p>
          )}

          <button className="w-full py-1 text-xs text-neutral-400" onClick={onClose}>
            关 闭
          </button>
        </div>
      </div>
    </div>
  );
}
