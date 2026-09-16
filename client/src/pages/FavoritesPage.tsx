import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";
import type { SceneTag } from "../api/types";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "quick", label: "15分钟速成" },
  { key: "weekend", label: "周末大餐" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export function FavoritesPage() {
  const favorites = useFavorites();
  const source = useAppStore((s) => s.source);
  const setSource = useAppStore((s) => s.setSource);
  const [filter, setFilter] = useState<FilterKey>("all");

  const items = useMemo(() => {
    const all = favorites.data?.items ?? [];
    return filter === "all" ? all : all.filter((i) => i.scene_tags.includes(filter as SceneTag));
  }, [favorites.data, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.continent);
      if (list) list.push(item);
      else map.set(item.continent, [item]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">❤️ 我的收藏</h1>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs ${
              filter === f.key ? "bg-brand-500 text-white" : "bg-white text-neutral-500 shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
        <span className="text-sm">🎡 从我的收藏夹转动</span>
        <input
          type="checkbox"
          data-testid="source-switch"
          checked={source === "favorites"}
          onChange={(e) => setSource(e.target.checked ? "favorites" : "all")}
          className="h-5 w-5 accent-[#ff6b35]"
        />
      </label>

      {grouped.map(([continent, list]) => (
        <section key={continent} className="mt-4">
          <h2 className="mb-2 text-xs text-neutral-400">{continent}</h2>
          <div className="space-y-2">
            {list.map((item) => (
              <Link
                key={item.id}
                to={`/recipe/${item.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-neutral-400">
                    ⏱ {item.minutes} 分钟 · {item.cuisine_path}
                  </span>
                </span>
                <span className="text-neutral-300">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {items.length === 0 && (
        <div className="mt-10 text-center text-sm text-neutral-400">
          还没有收藏，去食谱页点亮红心吧
        </div>
      )}
    </div>
  );
}
