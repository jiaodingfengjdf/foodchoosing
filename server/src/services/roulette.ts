import type { DB } from "../db";
import { HttpError } from "../util/http";
import { statDate, addDays } from "../util/dates";

export type RecipeRow = {
  id: string; cuisine_id: string; name: string; name_en: string; emoji: string; image_path: string | null;
  kcal: number; minutes: number; difficulty: number; taste_tags: string; ingredients: string;
  tools: string; steps: string; solo_tip: string; color_tag: string;
};

type CuisineRow = {
  id: string; level: number; parent_id: string | null; name: string; name_en: string; tags: string;
};

type Source = "all" | "favorites";

export interface SpinResult {
  result: RecipeRow;
  candidates: RecipeRow[];
  pooledUp: string | null;
  rerollLeft: number;
}

const FREE_REROLLS = 2;
const POOL_FLOOR = 6;
const POOL_CEIL = 8;
const RATIO = { easy: 0.5, medium: 0.35, hard: 0.15 } as const;

const selectRecipesByCuisine = (db: DB) => db.prepare("SELECT * FROM recipes WHERE cuisine_id = ?");
const selectFavoriteRecipes = (db: DB) =>
  db.prepare("SELECT r.* FROM recipes r JOIN favorites f ON f.recipe_id = r.id WHERE f.user_id = ?");
const selectAllRecipes = (db: DB) => db.prepare("SELECT * FROM recipes");
const getCuisine = (db: DB) => db.prepare("SELECT * FROM cuisines WHERE id = ?");

export function bucketize(pool: RecipeRow[]): { easy: RecipeRow[]; medium: RecipeRow[]; hard: RecipeRow[] } {
  const buckets: { easy: RecipeRow[]; medium: RecipeRow[]; hard: RecipeRow[] } = { easy: [], medium: [], hard: [] };
  for (const r of pool) {
    if (r.minutes <= 20) buckets.easy.push(r);
    else if (r.minutes <= 44) buckets.medium.push(r);
    else buckets.hard.push(r);
  }
  return buckets;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 按 50/35/15 难度配比抽样；桶不足时向相邻桶回退，池不足则返回全部。 */
export function sampleByRatio(pool: RecipeRow[], target: number, rng: () => number = Math.random): RecipeRow[] {
  const b = bucketize(pool);
  const easy = Math.round(target * RATIO.easy);
  const medium = Math.round(target * RATIO.medium);
  const q = { easy: Math.min(easy, b.easy.length), medium: Math.min(medium, b.medium.length), hard: Math.min(target - easy - medium, b.hard.length) };
  let assigned = q.easy + q.medium + q.hard;
  while (assigned < target) {
    let progressed = false;
    for (const k of ["easy", "medium", "hard"] as const) {
      if (assigned >= target) break;
      if (q[k] < b[k].length) {
        q[k]++;
        assigned++;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return [
    ...shuffle(b.easy, rng).slice(0, q.easy),
    ...shuffle(b.medium, rng).slice(0, q.medium),
    ...shuffle(b.hard, rng).slice(0, q.hard),
  ];
}

/** 过滤：7 天内（stat_date 口径）已打卡 + 拉黑未过期。 */
function filterRecentlyServed(db: DB, userId: string, rows: RecipeRow[]): RecipeRow[] {
  const today = statDate();
  const weekAgo = addDays(today, -6);
  const checked = new Set(
    (db.prepare("SELECT DISTINCT recipe_id FROM checkins WHERE user_id = ? AND stat_date >= ?")
      .all(userId, weekAgo) as { recipe_id: string }[]).map((r) => r.recipe_id)
  );
  const nowIsoStr = new Date().toISOString();
  const blocked = new Set(
    (db.prepare("SELECT recipe_id FROM blocks WHERE user_id = ? AND blocked_until > ?")
      .all(userId, nowIsoStr) as { recipe_id: string }[]).map((r) => r.recipe_id)
  );
  return rows.filter((r) => !checked.has(r.id) && !blocked.has(r.id));
}

function basePool(db: DB, userId: string, cuisineId: string | null, source: Source): RecipeRow[] {
  let rows: RecipeRow[];
  if (source === "favorites") rows = selectFavoriteRecipes(db).all(userId) as RecipeRow[];
  else if (cuisineId === null) rows = selectAllRecipes(db).all() as RecipeRow[];
  else rows = selectRecipesByCuisine(db).all(cuisineId) as RecipeRow[];
  return filterRecentlyServed(db, userId, rows);
}

/** 取某个菜系节点自身及其全部后代的 id（递归）。 */
function descendantCuisineIds(db: DB, rootId: string): string[] {
  const rows = db
    .prepare(
      `WITH RECURSIVE sub(id) AS (
         SELECT id FROM cuisines WHERE id = ?
         UNION ALL
         SELECT c.id FROM cuisines c JOIN sub ON c.parent_id = sub.id
       ) SELECT id FROM sub`
    )
    .all(rootId) as { id: string }[];
  return rows.map((r) => r.id);
}

function recipesOfCuisines(db: DB, ids: string[]): RecipeRow[] {
  if (ids.length === 0) return [];
  const stmt = db.prepare(`SELECT * FROM recipes WHERE cuisine_id IN (${ids.map(() => "?").join(",")})`);
  return stmt.all(...ids) as RecipeRow[];
}

/**
 * 构建候选池。L4 菜系不足 6 道时逐级并入父级「整棵子树」的菜品（L4→L3→L2→L1），
 * 并返回提示文案；favorites 源与全库随机不做并池。
 */
export function buildPool(
  db: DB, userId: string, cuisineId: string | null, source: Source, today: string
): { pool: RecipeRow[]; pooledUp: string | null } {
  void today; // 归属日统一由 filterRecentlyServed 按 statDate() 计算，参数保留以稳定接口
  if (source === "favorites" || cuisineId === null) {
    return { pool: basePool(db, userId, cuisineId, source), pooledUp: null };
  }
  let pool = basePool(db, userId, cuisineId, "all");
  if (pool.length >= POOL_FLOOR) return { pool, pooledUp: null };

  let current = getCuisine(db).get(cuisineId) as CuisineRow | undefined;
  while (current?.parent_id) {
    const parent = getCuisine(db).get(current.parent_id) as CuisineRow | undefined;
    if (!parent) break;
    pool = filterRecentlyServed(db, userId, recipesOfCuisines(db, descendantCuisineIds(db, parent.id)));
    current = parent;
    if (pool.length >= POOL_FLOOR) {
      return { pool, pooledUp: `当前细分风味收录菜品较少，已自动整合${parent.name}经典菜品一同入池` };
    }
  }
  if (pool.length > 0) {
    return { pool, pooledUp: `当前细分风味收录菜品较少，已自动整合${current?.name ?? "全球"}经典菜品一同入池` };
  }
  return { pool, pooledUp: null };
}

function recordSpin(db: DB, userId: string, recipeId: string, source: string, action: string): void {
  db.prepare(
    "INSERT INTO spin_history (user_id, recipe_id, source, action, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, recipeId, source, action, new Date().toISOString());
}

function rerollUsed(db: DB, userId: string): number {
  const row = db.prepare("SELECT count FROM reroll_usage WHERE user_id = ? AND date = ?")
    .get(userId, statDate()) as { count: number } | undefined;
  return row?.count ?? 0;
}

function doSpin(db: DB, userId: string, cuisineId: string | null, source: Source, action: "spin" | "reroll"): SpinResult {
  const { pool, pooledUp } = buildPool(db, userId, cuisineId, source, statDate());
  if (pool.length === 0) {
    throw new HttpError(404, "EMPTY_POOL", "这个分类下暂时没有可选菜品，换一个菜系试试吧");
  }
  const target = Math.min(POOL_CEIL, Math.max(POOL_FLOOR, pool.length));
  const candidates = sampleByRatio(pool, target);
  const result = candidates[Math.floor(Math.random() * candidates.length)];
  recordSpin(db, userId, result.id, source, action);
  return { result, candidates, pooledUp, rerollLeft: FREE_REROLLS - rerollUsed(db, userId) };
}

export function spin(db: DB, userId: string, cuisineId: string | null, source: Source): SpinResult {
  return doSpin(db, userId, cuisineId, source, "spin");
}

/** 「换一个」：每日 2 次免费额度，超出抛 429 REROLL_EXHAUSTED。 */
export function rerollSpin(db: DB, userId: string, cuisineId: string | null, source: Source): SpinResult {
  if (rerollUsed(db, userId) >= FREE_REROLLS) {
    throw new HttpError(429, "REROLL_EXHAUSTED", "今日挑食机会已用完，勇敢尝试一下吧！或手动切换其他菜系");
  }
  db.prepare(
    "INSERT INTO reroll_usage (user_id, date, count) VALUES (?, ?, 1) ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1"
  ).run(userId, statDate());
  return doSpin(db, userId, cuisineId, source, "reroll");
}

/** 临时拉黑：30 天内该菜品权重为 0。 */
export function blockRecipe(db: DB, userId: string, recipeId: string, now: Date): void {
  const until = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  db.prepare(
    "INSERT INTO blocks (user_id, recipe_id, blocked_until) VALUES (?, ?, ?) ON CONFLICT(user_id, recipe_id) DO UPDATE SET blocked_until = excluded.blocked_until"
  ).run(userId, recipeId, until);
  recordSpin(db, userId, recipeId, "all", "block");
}
