export interface CuisineNode {
  id: string;
  level: number;
  parent_id: string | null;
  name: string;
  name_en: string;
  tags: string[];
  dish_count: number;
}

export interface RecipeStep {
  text: string;
  seconds?: number;
  tip?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
}

export type SceneTag = "quick" | "weekend";

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
  ingredients: Ingredient[];
  tools: string[];
  steps: RecipeStep[];
  solo_tip: string;
  color_tag: string;
  is_favorite?: boolean;
  is_blocked?: boolean;
}

export interface SpinResponse {
  result: RecipeDTO;
  candidates: RecipeDTO[];
  pooled_up: string | null;
  reroll_left: number;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface CheckinResponse {
  checkin_id: string;
  streak: number;
  max_streak: number;
  stat_date: string;
  new_badges: BadgeInfo[];
}

export interface BadgeView extends BadgeInfo {
  rule_type: string;
  current: number;
  target: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface ContinentProgress {
  name: string;
  emoji: string;
  countries: number;
  dishes: number;
}

export interface PendingCheckinInfo {
  recipe_id: string;
  name: string;
  emoji: string;
}

export interface HistoryItem {
  checkin_id: string;
  recipe_id: string;
  name: string;
  emoji: string;
  photo_path: string | null;
  rating: number;
  stat_date: string;
}

export interface ProfileSummary {
  streak: { current: number; max: number };
  total_checkins: number;
  calendar: string[];
  continents: ContinentProgress[];
  pending_checkin: PendingCheckinInfo | null;
  history: HistoryItem[];
}

export type FavoriteItem = RecipeDTO & {
  favorited_at: string;
  continent: string;
  country: string;
  scene_tags: SceneTag[];
};

export type SpinSource = "all" | "favorites";
export type DifficultyPref = "easy" | "medium" | "hard" | null;
