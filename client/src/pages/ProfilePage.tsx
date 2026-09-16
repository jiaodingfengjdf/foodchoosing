import { useProfile, useBadges, useSettings } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";
import type { DifficultyPref } from "../api/types";

export function ProfilePage() {
  const profile = useProfile();
  const badges = useBadges();
  const settings = useSettings();
  const difficultyPref = useAppStore((s) => s.difficultyPref);
  const setDifficultyPref = useAppStore((s) => s.setDifficultyPref);
  const data = profile.data;
  const unlockedCount = badges.data?.badges.filter((b) => b.unlocked).length;

  const onDifficultyChange = (value: string) => {
    const next: DifficultyPref = value === "" ? null : (value as Exclude<DifficultyPref, null>);
    // 本地记住选中态（summary 不返回 settings），同时同步到服务端
    setDifficultyPref(next);
    settings.mutate({ difficulty_pref: next });
  };

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">👤 我的</h1>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "当前连击", value: data?.streak.current ?? "-" },
          { label: "最高纪录", value: data?.streak.max ?? "-" },
          { label: "总打卡", value: data?.total_checkins ?? "-" },
          { label: "徽章", value: unlockedCount ?? "-" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="text-xl font-bold text-brand-500">{s.value}</div>
            <div className="text-[10px] text-neutral-400">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">打卡时间轴</h2>
        <div className="space-y-2">
          {(data?.history ?? []).map((h) => (
            <div key={h.checkin_id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              {h.photo_path ? (
                <img src={h.photo_path} alt={h.name} className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50 text-2xl">
                  {h.emoji}
                </span>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {h.name} <span className="text-amber-500">{"★".repeat(h.rating)}</span>
                </div>
                <div className="text-xs text-neutral-400">{h.stat_date}</div>
              </div>
            </div>
          ))}
          {(data?.history ?? []).length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-400">还没有打卡记录</div>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold">设置</h2>
        <label className="flex items-center justify-between py-1.5 text-sm">
          转盘难度偏好
          <select
            data-testid="difficulty-select"
            className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
            value={difficultyPref ?? ""}
            onChange={(e) => onDifficultyChange(e.target.value)}
          >
            <option value="">不限</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">进阶</option>
          </select>
        </label>

        <button
          className="mt-2 w-full rounded-full border border-red-100 py-2 text-xs text-red-500"
          onClick={() => {
            if (window.confirm("确定清除本地数据（设备标识将重置）？")) {
              localStorage.clear();
              window.location.reload();
            }
          }}
        >
          清除本地数据
        </button>
      </section>
    </div>
  );
}
