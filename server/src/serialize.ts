import type { DB } from "./db";
import type { RecipeRow } from "./services/roulette";

export interface IngredientDTO {
  name: string;
  amount: string;
}

export interface StepDTO {
  text: string;
  seconds?: number;
  tip?: string;
}

export interface RecipeDTO {
  id: string;
  cuisine_id: string;
  cuisine_path: string;
  name: string;
  name_en: string;
  emoji: string;
  image_path: string | null;
  kcal: number;
  minutes: number;
  difficulty: number;
  taste_tags: string[];
  ingredients: IngredientDTO[];
  tools: string[];
  steps: StepDTO[];
  solo_tip: string;
  color_tag: string;
}

type CuisineRowLike = { id: string; name: string; parent_id: string | null };

/** 构造「亚洲 > 东亚 > 中国 > 川菜」形式的菜系路径解析器。 */
export function makeCuisinePath(db: DB) {
  const stmt = db.prepare("SELECT * FROM cuisines WHERE id = ?");
  return (cuisineId: string): string => {
    const names: string[] = [];
    let cur = stmt.get(cuisineId) as CuisineRowLike | undefined;
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent_id ? (stmt.get(cur.parent_id) as CuisineRowLike | undefined) : undefined;
    }
    return names.join(" > ");
  };
}

/** DB 行 → 对外 DTO：JSON 字符串字段解析为结构化数据，并补 cuisine_path。 */
export function toRecipeDTO(db: DB, row: RecipeRow): RecipeDTO {
  const path = makeCuisinePath(db);
  return {
    id: row.id,
    cuisine_id: row.cuisine_id,
    cuisine_path: path(row.cuisine_id),
    name: row.name,
    name_en: row.name_en,
    emoji: row.emoji,
    image_path: row.image_path,
    kcal: row.kcal,
    minutes: row.minutes,
    difficulty: row.difficulty,
    taste_tags: JSON.parse(row.taste_tags) as string[],
    ingredients: JSON.parse(row.ingredients) as IngredientDTO[],
    tools: JSON.parse(row.tools) as string[],
    steps: JSON.parse(row.steps) as StepDTO[],
    solo_tip: row.solo_tip,
    color_tag: row.color_tag,
  };
}
