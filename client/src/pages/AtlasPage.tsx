import { useBadges, useProfile } from "../api/hooks";
import { BadgeCard } from "../components/BadgeCard";

/** 每个大洲达成「环球饕客」所需的完成国家数，与后端 globe_master 的 per_continent 一致。 */
const COUNTRIES_PER_CONTINENT = 5;

export function AtlasPage() {
  const profile = useProfile();
  const badges = useBadges();
  const continents = profile.data?.continents ?? [];

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">🗺️ 美食图鉴</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold">五大洲探索</h2>
        <div className="grid grid-cols-2 gap-2">
          {continents.map((c) => (
            <div key={c.name} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-2xl">{c.emoji}</div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-neutral-400">
                {c.countries} 个国家 · {c.dishes} 道菜
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-neutral-100">
                <div
                  className="h-full rounded bg-brand-500"
                  style={{ width: `${Math.min(100, (c.countries / COUNTRIES_PER_CONTINENT) * 100)}%` }}
                />
              </div>
            </div>
          ))}
          {continents.length === 0 && (
            <div className="col-span-2 rounded-2xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm">
              还没有探索记录，去转个菜试试！
            </div>
          )}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">徽章墙</h2>
        <div className="grid grid-cols-3 gap-2">
          {(badges.data?.badges ?? []).map((b) => (
            <BadgeCard key={b.id} badge={b} />
          ))}
        </div>
      </section>
    </div>
  );
}
