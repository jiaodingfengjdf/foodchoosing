import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CuisinePicker } from "../components/CuisinePicker";
import { RouletteWheel } from "../components/RouletteWheel";
import { SpinResultModal } from "../components/SpinResultModal";
import { useSpin, useReroll, useProfile, useCatalog } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";
import { ApiError, track } from "../lib/api";
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
  const [error, setError] = useState("");
  const busy = useRef(false);
  const spinMut = useSpin();
  const rerollMut = useReroll();
  const profile = useProfile();
  const preview = useCatalog({ limit: 8, cuisine: cuisineId ?? undefined,
    status: source === "favorites" ? "favorites" : "all" });
  const loading = spinMut.isPending || rerollMut.isPending;
  useEffect(() => { setSpinData(null); setShowResult(false); setOffline(false); setError(""); }, [cuisineId, source]);

  const doSpin = () => {
    if (busy.current) return;
    busy.current = true;
    track("roulette_spin_click", { selected_category: cuisineId ?? "global", source });
    setSpinning(false);
    setShowResult(false);
    setOffline(false);
    setError("");
    spinMut.mutate(
      { cuisine_id: cuisineId, source },
      {
        onSuccess: (d) => {
          setSpinData(d);
          setLastCandidates(d.candidates);
          setSpinning(true);
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            setError(err.message);
            busy.current = false;
            return;
          }
          // 断网降级：用上次缓存的候选池本地抽奖，保证核心决策链路不断
          const cached = useAppStore.getState().lastCandidates;
          const picked = cached ? localPick(cached) : null;
          if (picked && cached) {
            setSpinData({ result: picked, candidates: cached, pooled_up: null, reroll_left: 0 });
            setOffline(true);
            setSpinning(true); // 动画结束后由 onSpinEnd 打开弹窗
          } else {
            setSpinning(false);
            busy.current = false;
            setError("当前没有可用的离线菜单，请联网后再试。");
          }
        },
      }
    );
  };

  const doReroll = () => {
    if (busy.current) return;
    busy.current = true;
    setError("");
    rerollMut.mutate(
      { cuisine_id: cuisineId, source },
      {
        onSuccess: (d) => {
          setSpinData(d);
          setShowResult(false);
          setSpinning(true);
          setLastCandidates(d.candidates);
        },
        onError: (err) => { busy.current = false; setError(err instanceof Error ? err.message : "换菜失败，请重试"); },
      }
    );
  };

  const pending = profile.data?.pending_checkin;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col p-4">
      <div className="mb-5 mt-2">
        <p className="text-xs tracking-[0.2em] text-[#98775e]">给日常一点新鲜感</p>
        <h1 className="mt-2 text-3xl font-bold text-[#493527]">今天，吃点好的。</h1>
        <p className="mt-2 text-sm text-neutral-500">{preview.data ? `${preview.data.catalog_total} 道菜 · ${preview.data.cuisine_count} 种地方风味` : "从熟悉的家常菜，到没试过的地方风味"}</p>
      </div>
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm"
        data-testid="cuisine-capsule"
        disabled={loading || spinning}
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
          candidates={spinData?.candidates ?? preview.data?.items ?? []}
          spinning={spinning}
          loading={loading}
          resultId={spinData?.result.id ?? null}
          onSpinEnd={() => {
            setSpinning(false);
            setShowResult(true);
            busy.current = false;
          }}
          onGo={doSpin}
        />
      </div>
      {error && <p role="alert" className="my-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button onClick={() => navigate("/atlas")} className="mb-3 rounded-2xl border border-[#e3d5c4] bg-white p-4 text-left text-sm text-[#65452f]">
        看看完整菜谱图鉴 <span className="float-right">浏览实拍与做法 →</span>
      </button>

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
