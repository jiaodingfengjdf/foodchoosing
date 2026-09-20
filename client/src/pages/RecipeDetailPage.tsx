import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecipe, useFavoriteToggle } from "../api/hooks";
import { api } from "../lib/api";
import { IngredientList } from "../components/IngredientList";
import { StepTimer } from "../components/StepTimer";
import { CheckinModal } from "../components/CheckinModal";
import { BadgeUnlockedModal } from "../components/BadgeUnlockedModal";
import { parseTimeSegments, type Segment } from "../lib/timeText";
import type { BadgeInfo } from "../api/types";

function StepText({ text, onTimer }: { text: string; onTimer: (seconds: number, label: string) => void }) {
  return (
    <p className="text-sm leading-6">
      {parseTimeSegments(text).map((seg: Segment, i: number) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <button
            key={i}
            className="mx-0.5 rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-600"
            onClick={() => onTimer(seg.seconds, seg.value)}
          >
            ⏱ {seg.value}
          </button>
        )
      )}
    </p>
  );
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRecipe(id);
  const [timer, setTimer] = useState<{ seconds: number; label: string } | null>(null);
  const [fav, setFav] = useState<boolean | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [badges, setBadges] = useState<BadgeInfo[]>([]);
  const toggleFav = useFavoriteToggle(id ?? "");
  const recipe = data?.recipe;

  if (isLoading || !recipe) {
    return <div className="p-10 text-center text-neutral-400">加载中…</div>;
  }

  const isFav = fav ?? recipe.is_favorite ?? false;
  const showImage = !!recipe.image_path && !imgFailed;

  return (
    <div className="pb-24">
      {/* 顶图（AI 图缺失或加载失败时回退 emoji 渐变块） */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-orange-100 to-amber-200">
        {showImage && (
          <img
            src={recipe.image_path as string}
            alt={recipe.name}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
        {!showImage && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#947760]">这道菜的实拍正在补充</div>
        )}
        <button
          onClick={() => navigate(-1)}
          aria-label="返回"
          className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-sm"
        >
          ←
        </button>
      </div>

      <div className="p-4">
        <h1 className="text-xl font-bold">{recipe.name}</h1>
        {recipe.source_url && <a href={recipe.source_url} target="_blank" rel="noreferrer" className="mt-2 block text-xs text-[#947760]">{recipe.source_name} · 查看原始出处 ↗</a>}
        {recipe.source_note && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{recipe.source_note}</p>}
        {recipe.servings_note && <details className="mt-3 rounded-xl border border-neutral-200 bg-white p-3 text-sm"><summary className="cursor-pointer font-medium">配方用量与份量说明</summary><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-neutral-600">{recipe.servings_note}</p></details>}
        <p className="text-xs text-neutral-400">
          {recipe.name_en} · {recipe.cuisine_path}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-1">⏱ {recipe.minutes} 分钟</span>
          <span className="rounded-full bg-neutral-100 px-2 py-1">
            {"★".repeat(recipe.difficulty)} 难度
          </span>
          {recipe.kcal > 0 && <span className="rounded-full bg-neutral-100 px-2 py-1">参考热量 {recipe.kcal} kcal</span>}
          {recipe.taste_tags.map((t) => (
            <span key={t} className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
              {t}
            </span>
          ))}
        </div>

        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold">🛒 原材料（1 人份）</h2>
          <IngredientList items={recipe.ingredients} />
        </section>

        <section className="mt-5">
          <h2 className="mb-1.5 text-sm font-semibold">🍳 必备厨具</h2>
          <div className="flex flex-wrap gap-1.5">
            {recipe.tools.map((t) => (
              <span key={t} className="rounded-full bg-neutral-100 px-2 py-1 text-xs">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-3">
          <h2 className="text-sm font-semibold">👨‍🍳 烹饪步骤</h2>
          {recipe.steps.map((s, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                  {i + 1}
                </span>
                {s.tip && <span className="text-xs text-amber-600">💡 {s.tip}</span>}
              </div>
              <StepText text={s.text} onTimer={(seconds, label) => setTimer({ seconds, label })} />
            </div>
          ))}
        </section>

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800" data-testid="solo-tip">
          🏠 一人食贴士：{recipe.solo_tip}
        </div>
      </div>

      {timer && <StepTimer seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />}

      {/* 底部悬浮操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center gap-2 border-t border-neutral-100 bg-white/95 p-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-xl"
          data-testid="fav-toggle"
          aria-label={isFav ? "取消收藏" : "收藏"}
          onClick={() => {
            const next = !isFav;
            setFav(next);
            toggleFav.mutate(next);
          }}
        >
          {isFav ? "❤️" : "🤍"}
        </button>
        <button
          className="h-11 rounded-full border border-neutral-200 px-3 text-xs text-neutral-500"
          data-testid="block-button"
          onClick={() => {
            void api(`/api/recipes/${recipe.id}/block`, { method: "POST" });
            navigate("/");
          }}
        >
          近期不想看到它
        </button>
        <button
          className="ml-auto h-11 flex-1 rounded-full bg-brand-500 font-medium text-white"
          data-testid="checkin-open"
          onClick={() => setCheckinOpen(true)}
        >
          完成今日打卡
        </button>
      </div>

      {checkinOpen && (
        <CheckinModal
          recipe={recipe}
          onClose={() => setCheckinOpen(false)}
          onSuccess={(r) => setBadges(r.new_badges)}
        />
      )}

      {badges.length > 0 && <BadgeUnlockedModal badges={badges} onClose={() => setBadges([])} />}
    </div>
  );
}
