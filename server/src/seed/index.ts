import type { DB } from "../db";
import { CUISINES } from "./cuisines";
import { BADGES } from "./badge-defs";

export { CUISINES } from "./cuisines";
export { BADGES } from "./badge-defs";
export type { CuisineSeed } from "./cuisines";
export type { BadgeDefSeed } from "./badge-defs";

export function seedAll(db: DB): void {
  const insertCuisine = db.prepare(
    "INSERT OR IGNORE INTO cuisines (id, level, parent_id, name, name_en, tags) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const [id, level, parentId, name, nameEn, tags] of CUISINES) {
    insertCuisine.run(id, level, parentId, name, nameEn, JSON.stringify(tags));
  }
  const insertBadge = db.prepare(
    "INSERT OR IGNORE INTO badge_defs (id, name, description, icon, category, rule_type, rule_params, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const b of BADGES) {
    insertBadge.run(b.id, b.name, b.description, b.icon, b.category, b.ruleType, JSON.stringify(b.ruleParams), b.sort);
  }
}
