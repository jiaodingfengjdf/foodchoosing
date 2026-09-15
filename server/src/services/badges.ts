import type { DB } from "../db";
import { computeStreak } from "./streak";
import { statDate } from "../util/dates";

export interface BadgeDefRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rule_type: string;
  rule_params: string;
  sort: number;
}

export interface BadgeView extends BadgeDefRow {
  current: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface CuisineMeta {
  id: string;
  level: number;
  parent_id: string | null;
  name: string;
  tags: string;
}

interface CheckedRecipe {
  id: string;
  minutes: number;
  color_tag: string;
  cuisine_id: string;
}

/** 各 rule_type 的 rule_params 形状（取并集，按 rule_type 取用其中若干字段）。 */
interface RuleParams {
  continents?: string[];
  countries?: string[];
  distinct?: number;
  tag?: string;
  per_continent?: number;
  days?: number;
  minutes_max?: number;
  count?: number;
  hour?: number;
}

function cuisinesMap(db: DB): Map<string, CuisineMeta> {
  const map = new Map<string, CuisineMeta>();
  for (const row of db.prepare("SELECT * FROM cuisines").all() as CuisineMeta[]) map.set(row.id, row);
  return map;
}

function ancestorsOf(map: Map<string, CuisineMeta>, cuisineId: string): CuisineMeta[] {
  const chain: CuisineMeta[] = [];
  let cur = map.get(cuisineId);
  while (cur) {
    chain.unshift(cur);
    cur = cur.parent_id ? map.get(cur.parent_id) : undefined;
  }
  return chain;
}

/** 该用户去重打卡过的菜谱（带耗时/主色/菜系），供各规则复用。 */
function distinctCheckedRecipes(db: DB, userId: string): CheckedRecipe[] {
  return db
    .prepare(
      `SELECT DISTINCT r.id, r.minutes, r.color_tag, r.cuisine_id
         FROM checkins c JOIN recipes r ON r.id = c.recipe_id
        WHERE c.user_id = ?`
    )
    .all(userId) as CheckedRecipe[];
}

function checkedStreak(db: DB, userId: string): number {
  const dates = (db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?").all(userId) as {
    stat_date: string;
  }[]).map((r) => r.stat_date);
  return computeStreak(dates, statDate()).current;
}

/** 按 rule_type 分派计算某枚徽章的当前进度与目标值。 */
export function badgeProgress(db: DB, userId: string, def: BadgeDefRow): { current: number; target: number } {
  const params = JSON.parse(def.rule_params) as RuleParams;

  switch (def.rule_type) {
    case "cuisine_continent_count": {
      const map = cuisinesMap(db);
      const continents = params.continents ?? [];
      const countries = params.countries ?? [];
      const n = distinctCheckedRecipes(db, userId).filter((r) => {
        const chain = ancestorsOf(map, r.cuisine_id);
        const l1 = chain.find((c) => c.level === 1)?.name;
        const l3 = chain.find((c) => c.level === 3)?.name;
        return (l1 !== undefined && continents.includes(l1)) || (l3 !== undefined && countries.includes(l3));
      }).length;
      return { current: n, target: params.distinct ?? 1 };
    }

    case "cuisine_tag_count": {
      const map = cuisinesMap(db);
      const n = distinctCheckedRecipes(db, userId).filter((r) => {
        const cuisine = map.get(r.cuisine_id);
        return cuisine ? (JSON.parse(cuisine.tags) as string[]).includes(params.tag ?? "") : false;
      }).length;
      return { current: n, target: params.distinct ?? 1 };
    }

    case "continent_coverage": {
      const map = cuisinesMap(db);
      const continents = params.continents ?? [];
      const perContinent = params.per_continent ?? 1;
      const byContinent = new Map<string, Set<string>>();
      for (const r of distinctCheckedRecipes(db, userId)) {
        const chain = ancestorsOf(map, r.cuisine_id);
        const l1 = chain.find((c) => c.level === 1)?.name;
        const l3 = chain.find((c) => c.level === 3)?.name;
        if (!l1 || !l3 || !continents.includes(l1)) continue;
        let set = byContinent.get(l1);
        if (!set) {
          set = new Set<string>();
          byContinent.set(l1, set);
        }
        set.add(l3);
      }
      const met = [...byContinent.values()].filter((s) => s.size >= perContinent).length;
      return { current: met, target: continents.length };
    }

    case "streak_days":
      return { current: checkedStreak(db, userId), target: params.days ?? 1 };

    case "fast_dish_count": {
      const max = params.minutes_max ?? 0;
      const n = distinctCheckedRecipes(db, userId).filter((r) => r.minutes <= max).length;
      return { current: n, target: params.count ?? 1 };
    }

    case "late_night_count": {
      const hour = params.hour ?? 0;
      const rows = db.prepare("SELECT created_at FROM checkins WHERE user_id = ?").all(userId) as {
        created_at: string;
      }[];
      const n = rows.filter((r) => new Date(r.created_at).getHours() >= hour).length;
      return { current: n, target: params.count ?? 1 };
    }

    case "color_variety": {
      const n = new Set(distinctCheckedRecipes(db, userId).map((r) => r.color_tag)).size;
      return { current: n, target: params.distinct ?? 1 };
    }

    default:
      return { current: 0, target: 1 };
  }
}

/** 判定全部徽章，事务内落库，返回**本次新解锁**的定义行。 */
export function evaluateBadges(db: DB, userId: string, now: Date): BadgeDefRow[] {
  const defs = db.prepare("SELECT * FROM badge_defs ORDER BY sort").all() as BadgeDefRow[];
  const selectUnlocked = db.prepare("SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?");
  const insertUnlocked = db.prepare(
    "INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at, progress_snapshot) VALUES (?, ?, ?, ?)"
  );
  const unlockedAt = now.toISOString();
  const newlyUnlocked: BadgeDefRow[] = [];

  db.transaction(() => {
    for (const def of defs) {
      if (selectUnlocked.get(userId, def.id)) continue;
      const { current, target } = badgeProgress(db, userId, def);
      if (current < target) continue;
      insertUnlocked.run(userId, def.id, unlockedAt, JSON.stringify({ current, target }));
      newlyUnlocked.push(def);
    }
  })();

  return newlyUnlocked;
}

export function listBadgesForUser(db: DB, userId: string): BadgeView[] {
  const defs = db.prepare("SELECT * FROM badge_defs ORDER BY sort").all() as BadgeDefRow[];
  const unlockedRows = db
    .prepare("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?")
    .all(userId) as { badge_id: string; unlocked_at: string }[];
  const unlockedMap = new Map(unlockedRows.map((r) => [r.badge_id, r.unlocked_at]));
  return defs.map((def) => {
    const { current, target } = badgeProgress(db, userId, def);
    const unlockedAt = unlockedMap.get(def.id) ?? null;
    return { ...def, current, target, unlocked: unlockedAt !== null, unlocked_at: unlockedAt };
  });
}
