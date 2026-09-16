import { useEffect, useState } from "react";
import type { BadgeInfo } from "../api/types";
import { track } from "../lib/api";

/** 徽章解锁喜报：一次可能解锁多枚，逐枚展示。 */
export function BadgeUnlockedModal({ badges, onClose }: { badges: BadgeInfo[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const badge = badges[index];
  const isLast = index === badges.length - 1;

  useEffect(() => {
    if (badge) track("badge_unlock_view", { badge_id: badge.id, badge_category: badge.category });
  }, [badge]);

  if (!badge) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-8"
      data-testid="badge-unlocked-modal"
    >
      <div className="w-full max-w-xs rounded-3xl bg-white p-8 text-center">
        <p className="text-sm text-amber-600">🏅 徽章解锁</p>
        <div className="my-4 text-7xl">{badge.icon}</div>
        <h2 className="text-xl font-bold">{badge.name}</h2>
        <p className="mt-1 text-sm text-neutral-500">{badge.description}</p>
        <button
          className="mt-6 w-full rounded-full bg-brand-500 py-3 text-white"
          onClick={() => (isLast ? onClose() : setIndex(index + 1))}
        >
          {isLast ? "收下" : `下一枚（${index + 1}/${badges.length}）`}
        </button>
      </div>
    </div>
  );
}
