import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cuisines (
  id TEXT PRIMARY KEY, level INTEGER NOT NULL, parent_id TEXT,
  name TEXT NOT NULL, name_en TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY, cuisine_id TEXT NOT NULL REFERENCES cuisines(id),
  name TEXT NOT NULL, name_en TEXT NOT NULL, emoji TEXT NOT NULL, image_path TEXT,
  kcal INTEGER NOT NULL, minutes INTEGER NOT NULL, difficulty INTEGER NOT NULL,
  taste_tags TEXT NOT NULL, ingredients TEXT NOT NULL, tools TEXT NOT NULL,
  steps TEXT NOT NULL, solo_tip TEXT NOT NULL, color_tag TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL UNIQUE,
  settings TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  recipe_id TEXT NOT NULL REFERENCES recipes(id), photo_path TEXT,
  rating INTEGER NOT NULL, review TEXT, stat_date TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL, recipe_id TEXT NOT NULL, created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS spin_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, recipe_id TEXT NOT NULL,
  source TEXT NOT NULL, action TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reroll_usage (
  user_id TEXT NOT NULL, date TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
CREATE TABLE IF NOT EXISTS badge_defs (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL,
  category TEXT NOT NULL, rule_type TEXT NOT NULL, rule_params TEXT NOT NULL, sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL, badge_id TEXT NOT NULL, unlocked_at TEXT NOT NULL,
  progress_snapshot TEXT,
  PRIMARY KEY (user_id, badge_id)
);
CREATE TABLE IF NOT EXISTS blocks (
  user_id TEXT NOT NULL, recipe_id TEXT NOT NULL, blocked_until TEXT NOT NULL,
  PRIMARY KEY (user_id, recipe_id)
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, event_id TEXT NOT NULL,
  params TEXT NOT NULL, created_at TEXT NOT NULL
);
`;

export function openDb(dbPath?: string): DB {
  const resolved = dbPath ?? process.env.DB_PATH ?? path.resolve("data/what-to-eat.db");
  if (resolved !== ":memory:") fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  const recipeColumns = db.prepare("PRAGMA table_info(recipes)").all() as { name: string }[];
  if (!recipeColumns.some((column) => column.name === "metadata")) {
    db.exec("ALTER TABLE recipes ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'");
  }
  return db;
}
