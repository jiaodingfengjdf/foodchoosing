import type { BadgeView } from "../api/types";

/** 徽章卡：未解锁灰度 + 进度，已解锁彩色 + 解锁日期。 */
export function BadgeCard({ badge }: { badge: BadgeView }) {
  return (
    <div
      data-testid="badge-card"
      className={`rounded-2xl bg-white p-4 text-center shadow-sm ${
        badge.unlocked ? "" : "grayscale opacity-40"
      }`}
    >
      <div className="text-4xl">{badge.icon}</div>
      <div className="mt-1 text-sm font-medium">{badge.name}</div>
      <div className="text-xs text-neutral-400">
        {badge.unlocked
          ? (badge.unlocked_at ?? "").slice(0, 10)
          : `${badge.current}/${badge.target}`}
      </div>
    </div>
  );
}
