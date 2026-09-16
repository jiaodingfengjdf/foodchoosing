import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CuisinePicker } from "../components/CuisinePicker";
import { RouletteWheel } from "../components/RouletteWheel";
import { SpinResultModal } from "../components/SpinResultModal";
import { useSpin, useReroll, useProfile } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";
import { track } from "../lib/api";
import { localPick } from "../lib/localSpin";
import type { SpinResponse } from "../api/types";

export function HomePage() {
  const { cuisineId, cuisineLabel, source, setLastCandidates } = useAppStore();
  const navigate = useNavigate();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinData, setSpinData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [offline, setOffline] = useState(false);
  const spinMut = useSpin();
  const rerollMut = useReroll();
  const profile = useProfile();

  const doSpin = () => {
    track("roulette_spin_click", { selected_category: cuisineId ?? "global", source });
    setSpinning(true);
    setShowResult(false);
    setOffline(false);
    spinMut.mutate(
      { cuisine_id: cuisineId, source },
      {
        onSuccess: (d) => {
          setSpinData(d);
          setLastCandidates(d.candidates);
        },
        onError: () => {
          // 断网降级：用上次缓存的候选池本地抽奖，保证核心决策链路不断
          const cached = useAppStore.getState().lastCandidates;
          const picked = cached ? localPick(cached) : null;
          if (picked && cached) {
            setSpinData({ result: picked, candidates: cached, pooled_up: null, reroll_left: 0 });
            setOffline(true);
            setSpinning(true); // 动画结束后由 onSpinEnd 打开弹窗
          } else {
            setSpinning(false);
          }
        },
      }
    );
  };

  const doReroll = () => {
    rerollMut.mutate(
      { cuisine_id: cuisineId, source },
      {
        onSuccess: (d) => {
          setSpinData(d);
          setShowResult(false);
          setSpinning(true);
        },
      }
    );
  };

  const pending = profile.data?.pending_checkin;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col p-4">
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

      {pending && (
        <button
          className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-left text-xs text-amber-700"
          onClick={() => navigate(`/recipe/${pending.recipe_id}`)}
          data-testid="pending-checkin-banner"
        >
          昨天的「{pending.name}」还没打卡，去补个记录吧 →
        </button>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        <RouletteWheel
          candidates={spinData?.candidates ?? []}
          spinning={spinning}
          resultId={spinData?.result.id ?? null}
          onSpinEnd={() => {
            setSpinning(false);
            setShowResult(true);
          }}
          onGo={doSpin}
        />
      </div>

      <p className="pb-2 text-center text-xs text-neutral-400">
        {offline
          ? "当前离线，已用缓存菜单本地抽奖"
          : spinMut.isError
            ? "转盘开小差了，点按钮重试"
            : "选定风味圈，转一转决定今晚吃什么"}
      </p>

      <CuisinePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />

      {showResult && spinData && (
        <SpinResultModal
          data={spinData}
          offline={offline}
          onClose={() => setShowResult(false)}
          onReroll={doReroll}
          rerolling={rerollMut.isPending}
        />
      )}
    </div>
  );
}
