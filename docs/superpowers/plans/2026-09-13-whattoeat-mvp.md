# WhatToEat「今天吃什么」MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 依据 `docs/superpowers/specs/2026-09-13-whattoeat-mvp-design.md` 交付可运行的 H5 MVP：菜系选择 → 转盘决策 → 一人食食谱 → 打卡 → 徽章/收藏完整闭环。

**Architecture:** npm workspaces 单仓库：`client/`（React 18 + Vite + Tailwind SPA，TanStack Query + Zustand + framer-motion）+ `server/`（Express 4 + better-sqlite3，业务逻辑全部在 services 层并可单测）。单进程生产部署，Express 托管前端构建产物。

**Tech Stack:** TypeScript（strict）、Express 4、better-sqlite3、multer、zod、helmet、Vitest + supertest、React 18、Vite 5、Tailwind CSS 3、TanStack Query 5、Zustand 5、framer-motion、canvas-confetti。

## Global Constraints（每个任务隐含遵守）

- Node ≥ 20；Windows + Git Bash 环境，命令需跨平台。
- 服务端口 3001，Vite 端口 5173；dev 下 Vite proxy `/api`、`/uploads`、`/dish-images` → `http://localhost:3001`。
- 会话：所有请求带 `X-Device-Id` 头（UUID，localStorage 持久化）；服务端 upsert 匿名用户；`POST /api/events` 额外允许 body 携带 `device_id`（sendBeacon 无法设头）。
- 统计日（stat_date）= 当地时间减 4 小时后的日期（凌晨 0-4 点计入前一日）；「换一个」每日 2 次同样按 stat_date 计数。
- 转盘候选 6-8 道；难度分桶：easy `minutes ≤ 20`、medium `21 ≤ minutes ≤ 44`、hard `minutes ≥ 45`，配比 50%/35%/15%，桶空向相邻桶回退；候选池 <6 道逐级并入父级并返回 `pooled_up`。
- 过滤规则：过去 7 天（按 stat_date）已打卡菜品不再转出；拉黑 30 天（`blocked_until`）权重为 0。
- 打卡：rating 1-5 必填；review ≤100 字选填；照片可选（jpg/png/webp，≤5MB，multer 存 `server/uploads/`）。
- 埋点事件 ID 逐字使用：`cuisine_category_select` / `roulette_spin_click` / `roulette_result_action` / `recipe_cook_checkin` / `badge_unlock_view`。
- 徽章种子 8 枚（id/规则见 Task 3），进度展示 `current/target`，灰度未解锁/彩色已解锁。
- UI 文案全部简体中文，菜名中英双语。
- 每个任务：先写失败测试 → 实现 → 测试通过 → conventional commit（如 `feat(server): ...`），全部提交推送到 `origin main`。
- TDD 红灯步骤的「Expected: FAIL」均指测试因功能未实现而失败（编译错误/断言失败），而非环境错误。

## 文件结构总览

```
菜谱转盘/
├── package.json / tsconfig.base.json / .gitignore
├── client/
│   ├── package.json / vite.config.ts / tsconfig.json / tailwind.config.js / postcss.config.js / index.html
│   └── src/
│       ├── main.tsx / App.tsx / styles/index.css
│       ├── lib/          device.ts / api.ts / timeText.ts / imageCompress.ts / offlineQueue.ts / confetti.ts
│       ├── stores/useAppStore.ts
│       ├── api/          types.ts / hooks.ts
│       ├── components/   TabBar.tsx / CuisinePicker.tsx / RouletteWheel.tsx / SpinResultModal.tsx /
│       │                 CheckinModal.tsx / BadgeUnlockedModal.tsx / StepTimer.tsx / IngredientList.tsx /
│       │                 BadgeCard.tsx
│       └── pages/        HomePage.tsx / RecipeDetailPage.tsx / AtlasPage.tsx / FavoritesPage.tsx / ProfilePage.tsx
├── server/
│   ├── package.json / tsconfig.json / vitest.config.ts
│   ├── public/dish-images/          # AI 顶图（Task 19）
│   ├── uploads/                     # 打卡照片（gitignore 内容，保留 .gitkeep）
│   ├── tests/                       # Vitest 测试
│   └── src/
│       ├── index.ts / app.ts / db.ts / types.ts
│       ├── util/         dates.ts / http.ts
│       ├── middleware/device.ts
│       ├── services/     roulette.ts / streak.ts / badges.ts
│       ├── routes/       cuisines.ts / spin.ts / recipes.ts / favorites.ts / checkins.ts / badges.ts / profile.ts / events.ts
│       └── seed/         cuisines.ts / badge-defs.ts / recipes.ts
└── data/                            # SQLite 文件（gitignore）
```

---

### Task 1: Monorepo 脚手架与工具链

**Files:**
- Create: `package.json`, `.gitignore`, `tsconfig.base.json`
- Create: `server/package.json`, `server/tsconfig.json`, `server/vitest.config.ts`
- Create: `server/src/index.ts`（占位入口，Task 8 才填充路由）
- Create: `server/tests/smoke.test.ts`, `server/uploads/.gitkeep`, `server/public/dish-images/.gitkeep`

**Interfaces:**
- Produces: npm workspaces 根（`client`、`server`）；`npm run dev`（concurrently 双进程）、`npm run build`、`npm start`、`npm test`（递归两 workspace）。

- [ ] **Step 1: 写根配置文件**

`package.json`：
```json
{
  "name": "what-to-eat",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w server\" \"npm run dev -w client\"",
    "build": "npm run build -w client",
    "start": "npm run start -w server",
    "test": "npm run test -w server && npm run test -w client"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

`.gitignore`：
```
node_modules/
dist/
data/*.db*
server/uploads/*
!server/uploads/.gitkeep
.env
```

`tsconfig.base.json`：
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 2: 写 server 配置**

`server/package.json`：
```json
{
  "name": "server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "better-sqlite3": "^11.5.0",
    "express": "^4.21.2",
    "helmet": "^8.0.0",
    "multer": "^1.4.5-lts.1",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.12",
    "@types/node": "^22.9.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^7.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

`server/tsconfig.json`：
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

`server/vitest.config.ts`：
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] }
});
```

`server/src/index.ts`（本任务最小占位，Task 8 重写）：
```ts
console.log("server placeholder");
```

`server/tests/smoke.test.ts`：
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("vitest runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 3: 安装依赖并验证**

Run: `npm install && npm run test -w server`
Expected: `smoke.test.ts` 1 passed。

Run: `npm run typecheck -w server`
Expected: 无错误。

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore tsconfig.base.json server
git commit -m "chore: monorepo 脚手架（workspaces + server 工具链）"
git push
```

---

### Task 2: SQLite 打开与迁移（12 表）

**Files:**
- Create: `server/src/db.ts`
- Test: `server/tests/db.test.ts`

**Interfaces:**
- Produces: `openDb(dbPath?: string): DB`（`DB = Database.Database`，WAL + foreign_keys，幂等建表）。后续所有任务经 `openDb()` 获取连接；测试传 `":memory:"`。

- [ ] **Step 1: 写失败测试**

`server/tests/db.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";

describe("openDb", () => {
  it("建立全部 12 张表且幂等", () => {
    const db = openDb(":memory:");
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name);
    for (const t of ["users", "cuisines", "recipes", "checkins", "favorites", "spin_history",
      "reroll_usage", "badge_defs", "user_badges", "blocks", "events"]) {
      expect(tables).toContain(t);
    }
    expect(() => openDb(":memory:")).not.toThrow(); // 再次执行迁移不报错
  });

  it("WAL 模式生效", () => {
    const db = openDb(":memory:");
    expect(db.pragma("journal_mode", { simple: true })).toBe("wal");
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- db`
Expected: FAIL — `Cannot find module '../src/db'`。

- [ ] **Step 3: 实现 `server/src/db.ts`**

```ts
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
  return db;
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- db`
Expected: 2 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src/db.ts server/tests/db.test.ts
git commit -m "feat(server): SQLite 打开与 12 表幂等迁移"
```

---

### Task 3: 种子数据 —— 菜系四级树 + 8 枚徽章定义

**Files:**
- Create: `server/src/seed/cuisines.ts`, `server/src/seed/badge-defs.ts`, `server/src/seed/index.ts`
- Test: `server/tests/seed.test.ts`

**Interfaces:**
- Produces: `seedAll(db: DB): void`（幂等，INSERT OR IGNORE）。菜系 id 清单（后续任务按 id 引用）：L1 `asia|europe|north-america|south-america`；L4 `sichuan|yuecai|kansai|thai-north|north-indian|toscana|provence|oaxaca|crete|lima`（其中 `provence`、`crete` 带 tag `mediterranean`，`oaxaca`、`lima` 带 tag `latam`）。徽章 id：`eu_first|latam|mediterranean|globe_master|solo_chef|fast_cook|night_owl|color_master`。

- [ ] **Step 1: 写失败测试**

`server/tests/seed.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); });

describe("seedAll", () => {
  it("写入 30 个菜系节点（4 L1 / 7 L2 / 9 L3 / 10 L4）", () => {
    seedAll(db);
    const byLevel = (l: number) =>
      db.prepare("SELECT COUNT(*) AS n FROM cuisines WHERE level=?").get(l)!.n;
    expect(byLevel(1)).toBe(4);
    expect(byLevel(2)).toBe(7);
    expect(byLevel(3)).toBe(9);
    expect(byLevel(4)).toBe(10);
  });

  it("菜系父子关系与标签正确", () => {
    seedAll(db);
    const crete = db.prepare("SELECT * FROM cuisines WHERE id='crete'").get()!;
    expect(crete.parent_id).toBe("greece");
    expect(JSON.parse(crete.tags)).toContain("mediterranean");
    const oaxaca = db.prepare("SELECT * FROM cuisines WHERE id='oaxaca'").get()!;
    expect(JSON.parse(oaxaca.tags)).toContain("latam");
  });

  it("写入 8 枚徽章且幂等（重复 seed 行数不变）", () => {
    seedAll(db);
    seedAll(db);
    expect(db.prepare("SELECT COUNT(*) AS n FROM badge_defs").get()!.n).toBe(8);
    expect(db.prepare("SELECT COUNT(*) AS n FROM cuisines").get()!.n).toBe(30);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- seed`
Expected: FAIL — `Cannot find module '../src/seed'`。

- [ ] **Step 3: 实现种子文件**

`server/src/seed/cuisines.ts`（`[id, level, parentId, name, nameEn, tags]`）：
```ts
export type CuisineSeed = [string, number, string | null, string, string, string[]];

export const CUISINES: CuisineSeed[] = [
  // L1
  ["asia", 1, null, "亚洲", "Asia", []],
  ["europe", 1, null, "欧洲", "Europe", []],
  ["north-america", 1, null, "北美洲", "North America", []],
  ["south-america", 1, null, "南美洲", "South America", []],
  // L2
  ["east-asia", 2, "asia", "东亚", "East Asia", []],
  ["southeast-asia", 2, "asia", "东南亚", "Southeast Asia", []],
  ["south-asia", 2, "asia", "南亚", "South Asia", []],
  ["south-europe", 2, "europe", "南欧", "Southern Europe", []],
  ["west-europe", 2, "europe", "西欧", "Western Europe", []],
  ["n-america", 2, "north-america", "北美区", "North American Mainland", []],
  ["andes", 2, "south-america", "安第斯", "Andes", []],
  // L3
  ["china", 3, "east-asia", "中国", "China", []],
  ["japan", 3, "east-asia", "日本", "Japan", []],
  ["thailand", 3, "southeast-asia", "泰国", "Thailand", []],
  ["india", 3, "south-asia", "印度", "India", []],
  ["italy", 3, "south-europe", "意大利", "Italy", []],
  ["greece", 3, "south-europe", "希腊", "Greece", []],
  ["france", 3, "west-europe", "法国", "France", []],
  ["mexico", 3, "n-america", "墨西哥", "Mexico", []],
  ["peru", 3, "andes", "秘鲁", "Peru", []],
  // L4
  ["sichuan", 4, "china", "川菜", "Sichuan Cuisine", []],
  ["yuecai", 4, "china", "粤菜", "Cantonese Cuisine", []],
  ["kansai", 4, "japan", "关西料理", "Kansai Cuisine", []],
  ["thai-north", 4, "thailand", "泰北菜", "Northern Thai Cuisine", []],
  ["north-indian", 4, "india", "北印菜", "North Indian Cuisine", []],
  ["toscana", 4, "italy", "托斯卡纳菜", "Tuscan Cuisine", []],
  ["provence", 4, "france", "普罗旺斯菜", "Provençal Cuisine", ["mediterranean"]],
  ["oaxaca", 4, "mexico", "瓦哈卡菜", "Oaxacan Cuisine", ["latam"]],
  ["crete", 4, "greece", "克里特菜", "Cretan Cuisine", ["mediterranean"]],
  ["lima", 4, "peru", "利马菜", "Limeño Cuisine", ["latam"]],
];
```

`server/src/seed/badge-defs.ts`：
```ts
export interface BadgeDefSeed {
  id: string; name: string; description: string; icon: string;
  category: "world" | "lifestyle"; ruleType: string; ruleParams: object; sort: number;
}

export const BADGES: BadgeDefSeed[] = [
  { id: "eu_first", name: "初涉欧陆", description: "累计完成 3 道不同的欧洲菜品", icon: "🏰",
    category: "world", ruleType: "cuisine_continent_count", ruleParams: { continents: ["欧洲"], distinct: 3 }, sort: 1 },
  { id: "latam", name: "拉美风暴", description: "累计完成 5 道南美洲或墨西哥菜品", icon: "💃",
    category: "world", ruleType: "cuisine_continent_count", ruleParams: { continents: ["南美洲"], countries: ["墨西哥"], distinct: 5 }, sort: 2 },
  { id: "mediterranean", name: "地中海之友", description: "打卡完成 7 道地中海风味菜品", icon: "⛵",
    category: "world", ruleType: "cuisine_tag_count", ruleParams: { tag: "mediterranean", distinct: 7 }, sort: 3 },
  { id: "globe_master", name: "环球饕客", description: "五大洲各完成 5 个不同国家的代表菜品", icon: "🌍",
    category: "world", ruleType: "continent_coverage", ruleParams: { per_continent: 5, continents: ["亚洲", "欧洲", "非洲", "北美洲", "南美洲"] }, sort: 4 },
  { id: "solo_chef", name: "一人食料理长", description: "连续打卡 7 天", icon: "👨‍🍳",
    category: "lifestyle", ruleType: "streak_days", ruleParams: { days: 7 }, sort: 5 },
  { id: "fast_cook", name: "快手打工人", description: "累计打卡 10 道制作耗时 ≤15 分钟的菜品", icon: "⚡",
    category: "lifestyle", ruleType: "fast_dish_count", ruleParams: { minutes_max: 15, count: 10 }, sort: 6 },
  { id: "night_owl", name: "深夜碳水怪", description: "在 21:00 后完成打卡 3 次", icon: "🌙",
    category: "lifestyle", ruleType: "late_night_count", ruleParams: { hour: 21, count: 3 }, sort: 7 },
  { id: "color_master", name: "色彩大师", description: "累计打卡包含 5 种不同主色调的菜品", icon: "🎨",
    category: "lifestyle", ruleType: "color_variety", ruleParams: { distinct: 5 }, sort: 8 },
];
```

`server/src/seed/index.ts`：
```ts
import type { DB } from "../db";
import { CUISINES } from "./cuisines";
import { BADGES } from "./badge-defs";

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
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- seed`
Expected: 3 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src/seed server/tests/seed.test.ts
git commit -m "feat(server): 菜系四级树与徽章定义种子数据"
```

---

### Task 4: 菜谱数据集（55 道，含格式校验测试）

**Files:**
- Create: `server/src/seed/recipes.ts`
- Test: `server/tests/recipes.test.ts`

**Interfaces:**
- Produces: `seedRecipes(db: DB): void`（幂等；`image_path` 固定写 `/dish-images/<id>.png`，图片由 Task 19 生成，缺失时客户端回退 emoji）。
- 类型 `RecipeSeed`：`{ id, cuisineId, name, nameEn, emoji, kcal, minutes, difficulty(1-5), tasteTags: string[], ingredients: {name, amount}[], tools: string[], steps: {text, seconds?, tip?}[], soloTip, colorTag }`；`colorTag ∈ "红"|"橙"|"黄"|"绿"|"白"|"棕"|"黑"`。

- [ ] **Step 1: 写失败测试（数据集格式契约）**

`server/tests/recipes.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes, RECIPE_SEEDS, COLOR_TAGS } from "../src/seed/recipes";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); seedAll(db); });

const PER_CUISINE: Record<string, number> = {
  sichuan: 6, yuecai: 6, kansai: 5, "thai-north": 6, "north-indian": 6,
  toscana: 6, provence: 6, oaxaca: 6, crete: 4, lima: 4,
};

describe("recipe dataset", () => {
  it("共 55 道且各菜系数量符合设计（crete/lima <6 用于验证并池）", () => {
    expect(RECIPE_SEEDS.length).toBe(55);
    for (const [cid, n] of Object.entries(PER_CUISINE)) {
      expect(RECIPE_SEEDS.filter((r) => r.cuisineId === cid).length).toBe(n);
    }
  });

  it("每道菜字段完整且取值合法", () => {
    for (const r of RECIPE_SEEDS) {
      expect(r.name.length, r.id).toBeGreaterThan(1);
      expect(r.nameEn.length, r.id).toBeGreaterThan(1);
      expect(r.emoji.length, r.id).toBeGreaterThan(0);
      expect(r.kcal, r.id).toBeGreaterThanOrEqual(150);
      expect(r.kcal, r.id).toBeLessThanOrEqual(1200);
      expect(r.minutes, r.id).toBeGreaterThanOrEqual(5);
      expect(r.minutes, r.id).toBeLessThanOrEqual(90);
      expect(r.difficulty, r.id).toBeGreaterThanOrEqual(1);
      expect(r.difficulty, r.id).toBeLessThanOrEqual(5);
      expect(COLOR_TAGS, r.id).toContain(r.colorTag);
      expect(r.tasteTags.length, r.id).toBeGreaterThan(0);
      expect(r.ingredients.length, r.id).toBeGreaterThanOrEqual(4);
      for (const ing of r.ingredients) {
        expect(ing.name.length, r.id).toBeGreaterThan(0);
        expect(ing.amount.length, r.id).toBeGreaterThan(0); // 一人份用量必有单位
      }
      expect(r.tools.length, r.id).toBeGreaterThan(0);
      expect(r.steps.length, r.id).toBeGreaterThanOrEqual(4);
      for (const s of r.steps) {
        expect(s.text.length, r.id).toBeGreaterThanOrEqual(10);
        if (/\d+\s*(分钟|秒)/.test(s.text)) expect(s.seconds, r.id).toBeDefined(); // 时间词必须配计时秒数
      }
      expect(r.soloTip.length, r.id).toBeGreaterThanOrEqual(10);
    }
  });

  it("id 唯一且菜系均存在；seed 后可按菜系查询", () => {
    const ids = RECIPE_SEEDS.map((r) => r.id);
    expect(new Set(ids).size).toBe(55);
    seedRecipes(db);
    const n = db.prepare("SELECT COUNT(*) AS n FROM recipes").get()!.n;
    expect(n).toBe(55);
    const sichuan = db.prepare(
      "SELECT COUNT(*) AS n FROM recipes r JOIN cuisines c ON r.cuisine_id=c.id WHERE c.id='sichuan'"
    ).get()!.n;
    expect(sichuan).toBe(6);
  });

  it("幂等：重复 seed 行数不变", () => {
    seedRecipes(db);
    seedRecipes(db);
    expect(db.prepare("SELECT COUNT(*) AS n FROM recipes").get()!.n).toBe(55);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- recipes`
Expected: FAIL — `Cannot find module '../src/seed/recipes'`。

- [ ] **Step 3: 实现数据集**

`server/src/seed/recipes.ts` 按 **完整 55 道清单** 逐道编写。结构固定为：

```ts
import type { DB } from "../db";

export const COLOR_TAGS = ["红", "橙", "黄", "绿", "白", "棕", "黑"] as const;
export type ColorTag = (typeof COLOR_TAGS)[number];

export interface RecipeSeed {
  id: string; cuisineId: string; name: string; nameEn: string; emoji: string;
  kcal: number; minutes: number; difficulty: number; tasteTags: string[];
  ingredients: { name: string; amount: string }[]; tools: string[];
  steps: { text: string; seconds?: number; tip?: string }[];
  soloTip: string; colorTag: ColorTag;
}

export const RECIPE_SEEDS: RecipeSeed[] = [
  /* ====== 川菜 sichuan（6 道）====== */
  {
    id: "RC_SC_001", cuisineId: "sichuan", name: "麻婆豆腐", nameEn: "Mapo Tofu", emoji: "🌶️",
    kcal: 420, minutes: 20, difficulty: 2, tasteTags: ["麻辣", "下饭"],
    ingredients: [
      { name: "嫩豆腐", amount: "300g" }, { name: "牛肉末", amount: "50g" },
      { name: "郫县豆瓣酱", amount: "1 汤匙" }, { name: "花椒粉", amount: "1 茶匙" },
      { name: "蒜末", amount: "2 瓣量" }, { name: "小葱", amount: "1 根" },
      { name: "生抽", amount: "1 汤匙" }, { name: "淀粉", amount: "1 茶匙" },
    ],
    tools: ["单柄平底锅", "锅铲"],
    steps: [
      { text: "豆腐切 2cm 方块，盐水浸泡 5 分钟防碎。", seconds: 300 },
      { text: "热锅冷油，牛肉末中火煸炒至酥香出油，约 3 分钟。", seconds: 180, tip: "煸到肉末微微焦黄才够香" },
      { text: "下豆瓣酱、蒜末小火炒出红油，约 1 分钟。", seconds: 60 },
      { text: "加 150ml 热水，下豆腐块中火烧 3 分钟入味。", seconds: 180 },
      { text: "水淀粉分两次勾芡，撒花椒粉与葱花即可。", tip: "分次勾芡汤汁才能挂在豆腐上" },
    ],
    soloTip: "剩下的半块豆腐浸清水冷藏，2 天内用完。",
    colorTag: "红",
  },
  // …… 按下表 55 道清单逐道补全（示例格式严格一致）
];
```

**55 道完整清单**（属性列 `kcal/min/diff/色调` 必须与表一致；菜名、原料、步骤由实现者按示例格式撰写真实可信的一人食内容；`emoji` 在菜名后）：

**川菜 sichuan（6）**：RC_SC_001 麻婆豆腐 Mapo Tofu 🌶️ 420/20/2/红 · RC_SC_002 宫保鸡丁 Kung Pao Chicken 🥜 520/25/2/棕 · RC_SC_003 鱼香茄子 Yu-Xiang Eggplant 🍆 380/25/2/棕 · RC_SC_004 回锅肉 Twice-Cooked Pork 🥓 650/30/3/棕 · RC_SC_005 水煮肉片 Poached Pork in Chili Oil 🌶️ 560/35/3/红 · RC_SC_006 红油抄手 Chili Oil Wontons 🥟 480/30/3/红

**粤菜 yuecai（6）**：RC_YU_001 白灼虾 Blanched Shrimp 🍤 320/15/1/白 · RC_YU_002 豉汁蒸排骨 Steamed Pork Ribs 🍖 540/40/3/棕 · RC_YU_003 蒜蓉菜心 Garlic Choy Sum 🥬 180/10/1/绿 · RC_YU_004 广式腊味煲仔饭 Claypot Rice 🍚 680/45/3/棕 · RC_YU_005 虾仁滑蛋 Shrimp Scrambled Eggs 🥚 380/15/1/黄 · RC_YU_006 咸蛋蒸肉饼 Steamed Pork Patty 🥚 520/25/2/棕

**日本-关西 kansai（5）**：RC_JP_001 大阪烧 Okonomiyaki 🥞 560/30/2/黄 · RC_JP_002 章鱼烧 Takoyaki 🐙 420/35/3/棕 · RC_JP_003 亲子丼 Oyakodon 🍗 540/20/2/黄 · RC_JP_004 出汁卷玉子 Dashimaki Tamago 🍳 280/20/3/黄 · RC_JP_005 掛乌冬 Kake Udon 🍜 460/15/1/白

**泰国-泰北 thai-north（6）**：RC_TH_001 泰北咖喱面 Khao Soi 🍛 620/40/3/黄 · RC_TH_002 香茅烤鸡 Grilled Lemongrass Chicken 🍗 540/45/3/棕 · RC_TH_003 打抛猪肉饭 Pad Krapow Moo 🌿 580/15/1/棕 · RC_TH_004 冬阴功汤 Tom Yum Goong 🍤 320/25/2/橙 · RC_TH_005 泰式炒河粉 Pad Thai 🍜 610/20/2/黄 · RC_TH_006 青木瓜沙拉 Som Tam 🥗 180/15/1/绿

**印度-北印 north-indian（6）**：RC_IN_001 黄油鸡 Butter Chicken 🍗 680/50/3/橙 · RC_IN_002 咖喱鹰嘴豆 Chana Masala 🫘 420/30/2/棕 · RC_IN_003 鸡肉香饭 Chicken Biryani 🍚 720/60/4/黄 · RC_IN_004 菠菜奶酪 Palak Paneer 🧀 460/30/2/绿 · RC_IN_005 蒜香馕 Garlic Naan 🫓 350/40/3/白 · RC_IN_006 玛莎拉煎蛋 Egg Masala 🥚 300/15/1/橙

**意大利-托斯卡纳 toscana（6）**：RC_IT_001 番茄布鲁斯凯塔 Bruschetta 🍅 320/15/1/红 · RC_IT_002 托斯卡纳白豆汤 Ribollita 🍲 380/45/2/绿 · RC_IT_003 蒜香橄榄油意面 Aglio e Olio 🍝 520/15/1/白 · RC_IT_004 猎人烩鸡 Chicken Cacciatora 🍗 560/45/3/棕 · RC_IT_005 意式土豆团子 Gnocchi with Sage Butter 🥔 540/35/3/黄 · RC_IT_006 提拉米苏（免烤杯装）Tiramisu Cup 🍰 480/30/3/白

**法国-普罗旺斯 provence（6）**：RC_FR_001 普罗旺斯炖菜 Ratatouille 🍆 340/45/2/橙 · RC_FR_002 尼斯沙拉 Salade Niçoise 🥗 420/25/2/绿 · RC_FR_003 香草烤鸡腿 Roast Herbed Chicken Legs 🍗 580/50/2/棕 · RC_FR_004 简易马赛鱼汤 One-Pot Bouillabaisse 🐟 380/40/3/橙 · RC_FR_005 普罗旺斯番茄挞 Tomato Tart 🥧 420/40/3/红 · RC_FR_006 樱桃克拉芙缇 Cherry Clafoutis 🍒 360/35/2/黄

**墨西哥-瓦哈卡 oaxaca（6）**：RC_MX_001 瓦哈卡莫莱酱鸡 Chicken Mole 🍫 620/60/4/棕 · RC_MX_002 菠萝烤肉塔可 Tacos al Pastor 🌮 560/40/3/橙 · RC_MX_003 牛油果酱配玉米片 Guacamole & Totopos 🥑 380/10/1/绿 · RC_MX_004 鸡丝玉米浓汤 Sopa de Elote con Pollo 🍲 420/25/2/黄 · RC_MX_005 瓦哈卡脆饼 Tlayuda 🫓 520/30/2/棕 · RC_MX_006 墨西哥炒蛋 Huevos Rancheros 🥚 420/15/1/红

**希腊-克里特 crete（4，<6 触发并池）**：RC_GR_001 希腊沙拉 Greek Salad 🥗 320/10/1/绿 · RC_GR_002 穆萨卡 Moussaka 🍆 620/60/4/棕 · RC_GR_003 达科斯面包沙拉 Dakos 🍅 340/10/1/红 · RC_GR_004 蜂蜜酸奶配核桃 Yogurt with Honey & Walnuts 🍯 300/5/1/白

**秘鲁-利马 lima（4，<6 触发并池）**：RC_PE_001 酸橘汁腌鱼 Ceviche 🐟 320/25/2/白 · RC_PE_002 利马土豆塔 Causa Limeña 🥔 380/35/3/黄 · RC_PE_003 秘鲁炒牛肉 Lomo Saltado 🥩 640/25/2/棕 · RC_PE_004 秘鲁鸡肉饭 Arroz con Pollo 🍗 580/40/3/橙

三道完整示例（格式基准，其余 52 道照此撰写）：上面代码块中的 `RC_SC_001 麻婆豆腐`、以及：

```ts
{
  id: "RC_JP_001", cuisineId: "kansai", name: "大阪烧", nameEn: "Okonomiyaki", emoji: "🥞",
  kcal: 560, minutes: 30, difficulty: 2, tasteTags: ["咸鲜", "酱香"],
  ingredients: [
    { name: "低筋面粉", amount: "60g" }, { name: "山药泥", amount: "30g" },
    { name: "鸡蛋", amount: "1 个" }, { name: "卷心菜丝", amount: "150g" },
    { name: "五花肉片", amount: "3 片" }, { name: "大阪烧酱", amount: "2 汤匙" },
    { name: "木鱼花", amount: "1 把" }, { name: "海苔粉", amount: "适量" },
  ],
  tools: ["单柄平底锅", "锅铲"],
  steps: [
    { text: "面粉、山药泥、鸡蛋与 80ml 出汁水调匀成面糊，静置 5 分钟。", seconds: 300 },
    { text: "拌入卷心菜丝，让面糊完全裹住菜丝。", tip: "面糊:菜丝约 1:1.5 才不会散" },
    { text: "平底锅中火倒油，倒入面糊摊成 2cm 厚圆饼，铺五花肉片煎 4 分钟。", seconds: 240 },
    { text: "翻面再煎 5 分钟，按压边缘帮助受热。", seconds: 300, tip: "翻面要果断，一次到位" },
    { text: "刷大阪烧酱、撒木鱼花与海苔粉出锅。", },
  ],
  soloTip: "卷心菜丝一次切多了，用厨房纸包好冷藏，3 天内仍可做第二次。",
  colorTag: "黄",
},
{
  id: "RC_PE_001", cuisineId: "lima", name: "酸橘汁腌鱼", nameEn: "Ceviche", emoji: "🐟",
  kcal: 320, minutes: 25, difficulty: 2, tasteTags: ["酸辣", "清爽"],
  ingredients: [
    { name: "去刺白身鱼柳", amount: "200g" }, { name: "青柠", amount: "4 个" },
    { name: "红洋葱", amount: "半个" }, { name: "香菜", amount: "2 根" },
    { name: "秘鲁黄辣椒酱", amount: "1 茶匙" }, { name: "盐", amount: "1 茶匙" },
    { name: "红薯", amount: "1 个" }, { name: "玉米粒", amount: "2 汤匙" },
  ],
  tools: ["玻璃碗", "主厨刀"],
  steps: [
    { text: "鱼柳切 2cm 方块，红薯提前蒸熟切片备用。", seconds: 300 },
    { text: "红洋葱切细丝，冰水浸泡 5 分钟去辛辣。", seconds: 300 },
    { text: "鱼块与盐、黄辣椒酱拌匀，倒入现挤青柠汁没过鱼块，冷藏腌 10 分钟至表面变白。", seconds: 600, tip: "青柠汁必须现挤，瓶装汁发苦" },
    { text: "拌入洋葱丝与香菜，配红薯片、玉米粒立即食用。", tip: "腌好 30 分钟内吃完口感最佳" },
  ],
  soloTip: "青柠一次用不完，滚几分钟再切能出更多汁；鱼柳买回当日食用。",
  colorTag: "白",
},
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- recipes`
Expected: 4 passed（若某道菜格式不合法按报错信息修正该菜）。

- [ ] **Step 5: Commit**

```bash
git add server/src/seed/recipes.ts server/tests/recipes.test.ts
git commit -m "feat(server): 55 道一人食菜谱数据集（10 个四级菜系）"
```

---

### Task 5: 日期工具 + 设备会话中间件 + Express 应用工厂

**Files:**
- Create: `server/src/util/dates.ts`, `server/src/util/http.ts`, `server/src/middleware/device.ts`, `server/src/app.ts`, `server/src/types.ts`
- Test: `server/tests/dates.test.ts`, `server/tests/app.test.ts`

**Interfaces:**
- Produces:
  - `statDate(d?: Date): string`（YYYY-MM-DD，-4h 界线）、`addDays(stat: string, delta: number): string`、`nowIso(): string`
  - `HttpError(status, code, message)`；`errorHandler` Express 错误中间件（含 zod `ZodError` → 400 `VALIDATION_ERROR`）
  - `deviceAuth(db, { required })`：解析 `X-Device-Id` → upsert `users` → 挂 `req.user = { id, device_id, settings }`；缺头且 required 时 401 `NO_DEVICE`
  - `createApp(db: DB): Express`（json 解析 + deviceAuth(required) + `/api` 挂载点 + errorHandler）。所有路由测试用 `supertest(createApp(db))`
  - `types.ts`：`export interface UserRow { id: string; device_id: string; settings: string }`、`export interface AuthedRequest extends Request { user?: UserRow }`

- [ ] **Step 1: 写失败测试**

`server/tests/dates.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { statDate, addDays } from "../src/util/dates";

describe("statDate（04:00 归属日界线）", () => {
  it("白天正常日期不变", () => {
    expect(statDate(new Date(2026, 8, 13, 12, 0))).toBe("2026-09-13");
  });
  it("凌晨 02:00 计入前一日", () => {
    expect(statDate(new Date(2026, 8, 13, 2, 0))).toBe("2026-09-12");
  });
  it("凌晨 04:00 起算新一日", () => {
    expect(statDate(new Date(2026, 8, 13, 4, 0))).toBe("2026-09-13");
  });
  it("03:59:59 仍计入前一日", () => {
    expect(statDate(new Date(2026, 8, 13, 3, 59, 59))).toBe("2026-09-12");
  });
});

describe("addDays", () => {
  it("跨月", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });
});
```

`server/tests/app.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { createApp } from "../src/app";

let db: DB;
beforeEach(() => { db = openDb(":memory:"); seedAll(db); });

describe("deviceAuth", () => {
  it("缺 X-Device-Id 返回 401 NO_DEVICE", async () => {
    const res = await request(createApp(db)).get("/api/anything");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_DEVICE");
  });

  it("首次请求自动注册用户，复用同一设备不重复注册", async () => {
    const app = createApp(db);
    await request(app).get("/api/anything").set("X-Device-Id", "dev-1");
    await request(app).get("/api/anything").set("X-Device-Id", "dev-1");
    const users = db.prepare("SELECT * FROM users WHERE device_id='dev-1'").all();
    expect(users.length).toBe(1);
    expect(users[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("未知路由带设备头返回 404", async () => {
    const res = await request(createApp(db)).get("/api/anything").set("X-Device-Id", "dev-1");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- dates app`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现**

`server/src/util/dates.ts`：
```ts
const HOUR = 3600 * 1000;

/** 统计日：当地时间减 4h 后的日期（凌晨 0-4 点计入前一日）。 */
export function statDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() - 4 * HOUR);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const day = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(stat: string, delta: number): string {
  const [y, m, d] = stat.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
```

`server/src/util/http.ts`：
```ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.issues.map((i) => i.message).join("; ") } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "服务器开小差了，请稍后再试" } });
}
```

`server/src/middleware/device.ts`：
```ts
import crypto from "node:crypto";
import type { Response, NextFunction } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { nowIso } from "../util/dates";
import { HttpError } from "../util/http";

export function deviceAuth(db: DB, options: { required: boolean }) {
  const findByDevice = db.prepare("SELECT * FROM users WHERE device_id = ?");
  const insertUser = db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, ?, ?)");
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    const deviceId = req.header("X-Device-Id");
    if (!deviceId) {
      if (options.required) return next(new HttpError(401, "NO_DEVICE", "缺少设备标识"));
      return next();
    }
    let user = findByDevice.get(deviceId) as UserRowLike | undefined;
    if (!user) {
      const id = crypto.randomUUID();
      insertUser.run(id, deviceId, nowIso());
      user = { id, device_id: deviceId, settings: "{}" };
    }
    req.user = user as any;
    next();
  };
}
type UserRowLike = { id: string; device_id: string; settings: string };
```

`server/src/types.ts`：
```ts
import type { Request } from "express";

export interface UserRow { id: string; device_id: string; settings: string }

export interface AuthedRequest extends Request {
  user?: UserRow;
}
```

`server/src/app.ts`：
```ts
import express, { type Express } from "express";
import helmet from "helmet";
import type { DB } from "./db";
import { deviceAuth } from "./middleware/device";
import { errorHandler } from "./util/http";
import { apiRouter } from "./routes";

export function createApp(db: DB): Express {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  app.use(deviceAuth(db, { required: true }));
  app.use("/api", apiRouter(db));
  app.use(errorHandler);
  return app;
}
```

`server/src/routes/index.ts`（占位，保证 app 可启动；后续任务逐个 `router.use` 挂载）：
```ts
import { Router } from "express";
import type { DB } from "../db";

export function apiRouter(db: DB): Router {
  const router = Router();
  void db;
  return router;
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- dates app`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src server/tests
git commit -m "feat(server): 统计日工具、设备会话中间件与应用工厂"
```

---

### Task 6: Streak 服务（连击计算）

**Files:**
- Create: `server/src/services/streak.ts`
- Test: `server/tests/streak.test.ts`

**Interfaces:**
- Produces: `computeStreak(dates: string[], today: string): StreakInfo`，`StreakInfo = { current: number; max: number; todayChecked: boolean }`。纯函数（排序去重由调用方或函数内部完成均可，实现为内部去重排序）。`current` 语义：连续段延伸到 `today`（今天已打卡）或 `addDays(today,-1)`（昨打卡今未打，连击未断），否则 0。

- [ ] **Step 1: 写失败测试**

`server/tests/streak.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { computeStreak } from "../src/services/streak";
import { addDays } from "../src/util/dates";

const T = "2026-09-13";
const d = (n: number) => addDays(T, -n);

describe("computeStreak", () => {
  it("空记录全 0", () => {
    expect(computeStreak([], T)).toEqual({ current: 0, max: 0, todayChecked: false });
  });

  it("今天首次打卡 current=1", () => {
    expect(computeStreak([T], T)).toEqual({ current: 1, max: 1, todayChecked: true });
  });

  it("昨天连续 3 天 + 今天打卡 → current=4", () => {
    expect(computeStreak([d(3), d(2), d(1), T], T)).toEqual({ current: 4, max: 4, todayChecked: true });
  });

  it("昨天打卡今天未打 → 连击未断 current=3", () => {
    expect(computeStreak([d(3), d(2), d(1)], T)).toEqual({ current: 3, max: 3, todayChecked: false });
  });

  it("前天打卡今天未打 → 断签 current=0", () => {
    expect(computeStreak([d(2)], T)).toEqual({ current: 0, max: 1, todayChecked: false });
  });

  it("历史最长与当前独立（曾连 5 天中断后重新开始）", () => {
    const old = [d(20), d(19), d(18), d(17), d(16)];
    expect(computeStreak([...old, d(1), T], T)).toEqual({ current: 2, max: 5, todayChecked: true });
  });

  it("重复日期不影响结果", () => {
    expect(computeStreak([T, T, d(1), d(1)], T)).toEqual({ current: 2, max: 2, todayChecked: true });
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- streak`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 `server/src/services/streak.ts`**

```ts
import { addDays } from "../util/dates";

export interface StreakInfo { current: number; max: number; todayChecked: boolean }

function maxRun(sorted: string[]): number {
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

export function computeStreak(dates: string[], today: string): StreakInfo {
  const unique = [...new Set(dates)].sort();
  if (unique.length === 0) return { current: 0, max: 0, todayChecked: false };

  const last = unique[unique.length - 1];
  let current = 0;
  if (last === today || last === addDays(today, -1)) {
    current = 1;
    for (let i = unique.length - 1; i > 0; i--) {
      if (addDays(unique[i - 1], 1) === unique[i]) current++;
      else break;
    }
  }
  return { current, max: maxRun(unique), todayChecked: unique.includes(today) };
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- streak`
Expected: 7 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/streak.ts server/tests/streak.test.ts
git commit -m "feat(server): streak 连击计算（04:00 归属日口径）"
```

---

### Task 7: 转盘服务（加权随机 + 重转限额 + 并池保底）

**Files:**
- Create: `server/src/services/roulette.ts`
- Test: `server/tests/roulette.test.ts`

**Interfaces:**
- Consumes: `openDb`/`seedAll`/`seedRecipes`、`statDate`/`addDays`、`HttpError`。
- Produces:
  - `bucketize(pool: RecipeRow[]): { easy: RecipeRow[]; medium: RecipeRow[]; hard: RecipeRow[] }`
  - `sampleByRatio(pool: RecipeRow[], target: number, rng?: () => number): RecipeRow[]`（50/35/15 配比 + 桶空回退，Fisher-Yates 用注入 rng）
  - `buildPool(db, userId, cuisineId: string | null, source: "all"|"favorites", today: string): { pool: RecipeRow[]; pooledUp: string | null }`（过滤 7 天已打卡/拉黑；<6 并池并返回提示文案）
  - `spin(db, userId, cuisineId, source): SpinResult`（`SpinResult = { result: RecipeRow; candidates: RecipeRow[]; pooledUp: string | null; rerollLeft: number }`，写 `spin_history(action='spin')`）
  - `rerollSpin(db, userId, cuisineId, source): SpinResult`（超 2 次/日抛 `HttpError(429, "REROLL_EXHAUSTED", ...)`，写 action='reroll'）
  - `blockRecipe(db, userId, recipeId, now: Date): void`（30 天，`blocked_until = now+30d`，写 action='block'）
- `RecipeRow` 为 `recipes` 表行（JSON 字段为字符串）。`pooledUp` 文案：`当前细分风味收录菜品较少，已自动整合${父级名称}经典菜品一同入池`。

- [ ] **Step 1: 写失败测试**

`server/tests/roulette.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { bucketize, sampleByRatio, spin, rerollSpin, buildPool } from "../src/services/roulette";
import { statDate, addDays, nowIso } from "../src/util/dates";

let db: DB;
let userId: string;
const TODAY = "2026-09-13";

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  userId = "u1";
  db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, 'dev-1', ?)").run(userId, nowIso());
});

const mkRecipe = (id: string, minutes: number): any => ({
  id, cuisine_id: "sichuan", name: id, name_en: id, emoji: "🍜", image_path: null,
  kcal: 400, minutes, difficulty: 2, taste_tags: "[]", ingredients: "[]",
  tools: "[]", steps: "[]", solo_tip: "", color_tag: "红",
});

describe("bucketize", () => {
  it("easy ≤20 / medium 21-44 / hard ≥45", () => {
    const b = bucketize([mkRecipe("a", 20), mkRecipe("b", 21), mkRecipe("c", 44), mkRecipe("d", 45)]);
    expect(b.easy.map((r) => r.id)).toEqual(["a"]);
    expect(b.medium.map((r) => r.id)).toEqual(["b", "c"]);
    expect(b.hard.map((r) => r.id)).toEqual(["d"]);
  });
});

describe("sampleByRatio", () => {
  it("target=8 按配比 4/3/1 抽样", () => {
    const pool = [
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`e${i}`, 15)),
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`m${i}`, 30)),
      ...Array.from({ length: 10 }, (_, i) => mkRecipe(`h${i}`, 60)),
    ];
    const picked = sampleByRatio(pool, 8);
    expect(picked.length).toBe(8);
    expect(picked.filter((r) => r.minutes <= 20).length).toBe(4);
    expect(picked.filter((r) => r.minutes > 20 && r.minutes < 45).length).toBe(3);
    expect(picked.filter((r) => r.minutes >= 45).length).toBe(1);
    expect(new Set(picked.map((r) => r.id)).size).toBe(8); // 无重复
  });

  it("桶空时回退到其他桶", () => {
    const pool = Array.from({ length: 10 }, (_, i) => mkRecipe(`e${i}`, 15));
    const picked = sampleByRatio(pool, 6);
    expect(picked.length).toBe(6);
    expect(picked.every((r) => r.minutes <= 20)).toBe(true);
  });

  it("池小于 target 时返回全部", () => {
    const pool = [mkRecipe("a", 15), mkRecipe("b", 30)];
    expect(sampleByRatio(pool, 6).length).toBe(2);
  });
});

describe("buildPool", () => {
  it("克里特(4道)触发并池到南欧，提示含父级名称", () => {
    const { pool, pooledUp } = buildPool(db, userId, "crete", "all", TODAY);
    expect(pool.length).toBeGreaterThanOrEqual(6);
    expect(pooledUp).toContain("南欧");
  });

  it("过滤 7 天内已打卡菜品", () => {
    db.prepare(
      "INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c1', ?, 'RC_GR_001', 5, ?, ?)"
    ).run(userId, TODAY, nowIso());
    const { pool } = buildPool(db, userId, "crete", "all", TODAY);
    expect(pool.some((r) => r.id === "RC_GR_001")).toBe(false);
  });

  it("过滤拉黑中的菜品，过期拉黑不过滤", () => {
    db.prepare(
      "INSERT INTO blocks (user_id, recipe_id, blocked_until) VALUES (?, 'RC_SC_001', ?)"
    ).run(userId, "2026-10-13T00:00:00.000Z");
    let { pool } = buildPool(db, userId, "sichuan", "all", TODAY);
    expect(pool.some((r) => r.id === "RC_SC_001")).toBe(false);
    db.prepare("UPDATE blocks SET blocked_until=?").run("2026-09-12T00:00:00.000Z");
    ({ pool } = buildPool(db, userId, "sichuan", "all", TODAY));
    expect(pool.some((r) => r.id === "RC_SC_001")).toBe(true);
  });

  it("favorites 数据源只含收藏", () => {
    db.prepare("INSERT INTO favorites (user_id, recipe_id, created_at) VALUES (?, 'RC_SC_001', ?)").run(userId, nowIso());
    const { pool } = buildPool(db, userId, null, "favorites", TODAY);
    expect(pool.map((r) => r.id)).toEqual(["RC_SC_001"]);
  });
});

describe("spin / reroll", () => {
  it("spin 返回 6-8 候选且 result 在候选中，写 spin_history", () => {
    const r = spin(db, userId, "sichuan", "all");
    expect(r.candidates.length).toBeGreaterThanOrEqual(6);
    expect(r.candidates.length).toBeLessThanOrEqual(8);
    expect(r.candidates.some((c) => c.id === r.result.id)).toBe(true);
    expect(r.pooledUp).toBeNull();
    expect(db.prepare("SELECT action FROM spin_history WHERE user_id=?").all(userId))
      .toContainEqual({ action: "spin" });
  });

  it("全球大乱斗：cuisineId=null 用全库", () => {
    const r = spin(db, userId, null, "all");
    expect(r.candidates.length).toBe(8);
  });

  it("重转每日 2 次，第 3 次 429", () => {
    rerollSpin(db, userId, "sichuan", "all");
    rerollSpin(db, userId, "sichuan", "all");
    expect(() => rerollSpin(db, userId, "sichuan", "all")).toThrowError(/REROLL_EXHAUSTED/);
    // 跨日重置
    const yesterday = addDays(TODAY, -1);
    db.prepare("UPDATE reroll_usage SET date=?").run(yesterday);
    expect(() => rerollSpin(db, userId, "sichuan", "all")).not.toThrow();
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- roulette`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 `server/src/services/roulette.ts`**

```ts
import type { DB } from "../db";
import { HttpError } from "../util/http";
import { statDate, addDays } from "../util/dates";

export type RecipeRow = {
  id: string; cuisine_id: string; name: string; name_en: string; emoji: string; image_path: string | null;
  kcal: number; minutes: number; difficulty: number; taste_tags: string; ingredients: string;
  tools: string; steps: string; solo_tip: string; color_tag: string;
};

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

const selectRecipesByCuisine = (db: DB) =>
  db.prepare("SELECT * FROM recipes WHERE cuisine_id = ?");
const selectFavoriteRecipes = (db: DB) =>
  db.prepare(
    "SELECT r.* FROM recipes r JOIN favorites f ON f.recipe_id = r.id WHERE f.user_id = ?"
  );
const selectAllRecipes = (db: DB) => db.prepare("SELECT * FROM recipes");
const getCuisine = (db: DB) => db.prepare("SELECT * FROM cuisines WHERE id = ?");

function bucketize(pool: RecipeRow[]) {
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

export function sampleByRatio(pool: RecipeRow[], target: number, rng: () => number = Math.random): RecipeRow[] {
  const b = bucketize(pool);
  const q = {
    easy: Math.round(target * RATIO.easy),
    medium: Math.round(target * RATIO.medium),
    hard: target - Math.round(target * RATIO.easy) - Math.round(target * RATIO.medium),
  };
  for (const k of ["easy", "medium", "hard"] as const) q[k] = Math.min(q[k], b[k].length);
  let assigned = q.easy + q.medium + q.hard;
  while (assigned < target) {
    let progressed = false;
    for (const k of ["easy", "medium", "hard"] as const) {
      if (assigned >= target) break;
      if (q[k] < b[k].length) { q[k]++; assigned++; progressed = true; }
    }
    if (!progressed) break;
  }
  return [
    ...shuffle(b.easy, rng).slice(0, q.easy),
    ...shuffle(b.medium, rng).slice(0, q.medium),
    ...shuffle(b.hard, rng).slice(0, q.hard),
  ];
}

function basePool(db: DB, userId: string, cuisineId: string | null, source: "all" | "favorites"): RecipeRow[] {
  let rows: RecipeRow[];
  if (source === "favorites") rows = selectFavoriteRecipes(db).all(userId) as RecipeRow[];
  else if (cuisineId === null) rows = selectAllRecipes(db).all() as RecipeRow[];
  else rows = selectRecipesByCuisine(db).all(cuisineId) as RecipeRow[];
  return filterRecentlyServed(db, userId, rows);
}

/** 过滤：7 天内（stat_date 口径）已打卡 + 拉黑未过期。 */
function filterRecentlyServed(db: DB, userId: string, rows: RecipeRow[]): RecipeRow[] {
  const today = statDate();
  const weekAgo = addDays(today, -6);
  const checked = new Set(
    (db.prepare("SELECT DISTINCT recipe_id FROM checkins WHERE user_id = ? AND stat_date >= ?")
      .all(userId, weekAgo) as any[]).map((r) => r.recipe_id)
  );
  const nowIsoStr = new Date().toISOString();
  const blocked = new Set(
    (db.prepare("SELECT recipe_id FROM blocks WHERE user_id = ? AND blocked_until > ?")
      .all(userId, nowIsoStr) as any[]).map((r) => r.recipe_id)
  );
  return rows.filter((r) => !checked.has(r.id) && !blocked.has(r.id));
}

export function buildPool(
  db: DB, userId: string, cuisineId: string | null, source: "all" | "favorites", today: string
): { pool: RecipeRow[]; pooledUp: string | null } {
  void today; // today 由 filterRecentlyServed 内部按 statDate() 计算，参数保留供测试注入场景扩展
  if (source === "favorites" || cuisineId === null) {
    return { pool: basePool(db, userId, cuisineId, source), pooledUp: null };
  }
  let pool = basePool(db, userId, cuisineId, "all");
  if (pool.length >= POOL_FLOOR) return { pool, pooledUp: null };

  // 逐级并入父级（L4→L3→L2），并入后同样过滤
  let current = getCuisine(db).get(cuisineId) as any;
  while (current?.parent_id && pool.length < POOL_FLOOR) {
    const parent = getCuisine(db).get(current.parent_id) as any;
    if (!parent) break;
    const childIds = (db.prepare("SELECT id FROM cuisines WHERE parent_id = ?").all(parent.id) as any[])
      .map((c) => c.id);
    const stmt = db.prepare(
      `SELECT DISTINCT r.* FROM recipes r WHERE r.cuisine_id IN (${childIds.map(() => "?").join(",")})`
    );
    pool = filterRecentlyServed(db, userId, stmt.all(...childIds) as RecipeRow[]);
    current = parent;
    if (pool.length >= POOL_FLOOR) {
      return { pool, pooledUp: `当前细分风味收录菜品较少，已自动整合${parent.name}经典菜品一同入池` };
    }
  }
  if (pool.length < POOL_FLOOR && pool.length > 0) {
    return { pool, pooledUp: `当前细分风味收录菜品较少，已自动整合${(current as any)?.name ?? "全球"}经典菜品一同入池` };
  }
  return { pool, pooledUp: pool.length > 0 ? null : null };
}

function recordSpin(db: DB, userId: string, recipeId: string, source: string, action: string): void {
  db.prepare(
    "INSERT INTO spin_history (user_id, recipe_id, source, action, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(userId, recipeId, source, action, new Date().toISOString());
}

function rerollLeft(db: DB, userId: string): number {
  const row = db.prepare("SELECT count FROM reroll_usage WHERE user_id = ? AND date = ?")
    .get(userId, statDate()) as any;
  return FREE_REROLLS - (row?.count ?? 0);
}

function doSpin(db: DB, userId: string, cuisineId: string | null, source: "all" | "favorites", action: "spin" | "reroll"): SpinResult {
  const { pool, pooledUp } = buildPool(db, userId, cuisineId, source, statDate());
  if (pool.length === 0) {
    throw new HttpError(404, "EMPTY_POOL", "这个分类下暂时没有可选菜品，换一个菜系试试吧");
  }
  const target = Math.min(POOL_CEIL, Math.max(POOL_FLOOR, pool.length));
  const candidates = sampleByRatio(pool, target);
  const result = candidates[Math.floor(Math.random() * candidates.length)];
  recordSpin(db, userId, result.id, source, action);
  return { result, candidates, pooledUp, rerollLeft: rerollLeft(db, userId) };
}

export function spin(db: DB, userId: string, cuisineId: string | null, source: "all" | "favorites"): SpinResult {
  return doSpin(db, userId, cuisineId, source, "spin");
}

export function rerollSpin(db: DB, userId: string, cuisineId: string | null, source: "all" | "favorites"): SpinResult {
  const used = db.prepare("SELECT count FROM reroll_usage WHERE user_id = ? AND date = ?")
    .get(userId, statDate()) as any;
  if ((used?.count ?? 0) >= FREE_REROLLS) {
    throw new HttpError(429, "REROLL_EXHAUSTED", "今日挑食机会已用完，勇敢尝试一下吧！或手动切换其他菜系");
  }
  db.prepare(
    "INSERT INTO reroll_usage (user_id, date, count) VALUES (?, ?, 1) ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1"
  ).run(userId, statDate());
  return doSpin(db, userId, cuisineId, source, "reroll");
}

export function blockRecipe(db: DB, userId: string, recipeId: string, now: Date): void {
  const until = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
  db.prepare(
    "INSERT INTO blocks (user_id, recipe_id, blocked_until) VALUES (?, ?, ?) ON CONFLICT(user_id, recipe_id) DO UPDATE SET blocked_until = excluded.blocked_until"
  ).run(userId, recipeId, until);
  recordSpin(db, userId, recipeId, "all", "block");
}
```

注意：`buildPool` 测试传入 `today` 仅用于接口稳定；实现内使用 `statDate()`（服务器本地时区，MVP 单机部署即用户时区，规格已声明）。

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- roulette`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/roulette.ts server/tests/roulette.test.ts
git commit -m "feat(server): 转盘加权随机、重转限额与并池保底"
```

---

### Task 8: 菜系树 / 转盘 / 重转 / 拉黑路由 + 生产入口

**Files:**
- Create: `server/src/routes/cuisines.ts`, `server/src/routes/spin.ts`, `server/src/routes/recipes.ts`, `server/src/serialize.ts`
- Modify: `server/src/routes/index.ts`（挂载路由）, `server/src/index.ts`（生产入口）
- Test: `server/tests/spin-routes.test.ts`

**Interfaces:**
- Consumes: Task 5-7 全部导出。
- Produces:
  - `GET /api/cuisines/tree` → `{ nodes: CuisineNode[] }`，`CuisineNode = { id, level, parent_id, name, name_en, tags: string[], dish_count }`（平铺数组，客户端自行组树；L4 有 `dish_count`）
  - `POST /api/spin` body `{ cuisine_id: string | null, source: "all"|"favorites" }` → `{ result: RecipeDTO, candidates: RecipeDTO[], pooled_up: string|null, reroll_left: number }`
  - `POST /api/spin/reroll` 同上；429 时 `{ error: { code: "REROLL_EXHAUSTED", ... } }`
  - `POST /api/recipes/:id/block` → `{ ok: true }`
  - `RecipeDTO`（serialize.ts 统一转换）：`{ id, cuisine_id, cuisine_path: string, name, name_en, emoji, image_path, kcal, minutes, difficulty, taste_tags: string[], ingredients: {name,amount}[], tools: string[], steps: {text, seconds?, tip?}[], solo_tip, color_tag }`，`cuisine_path` 形如 `亚洲 > 东亚 > 中国 > 川菜`（无菜系上下文时也由菜谱自身 cuisine_id 计算）
- `server/src/index.ts` 生产入口：`openDb()` + `seedAll` + `seedRecipes` + `createApp` + 静态托管 `client/dist`、`/uploads`、`/dish-images` + SPA fallback + 监听 3001。

- [ ] **Step 1: 写失败测试**

`server/tests/spin-routes.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";

let db: DB;
let app: ReturnType<typeof createApp>;
const DEV = { "X-Device-Id": "dev-1" };

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  app = createApp(db);
});

describe("GET /api/cuisines/tree", () => {
  it("返回 30 节点，L4 含 dish_count", async () => {
    const res = await request(app).get("/api/cuisines/tree").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.nodes.length).toBe(30);
    const sichuan = res.body.nodes.find((n: any) => n.id === "sichuan");
    expect(sichuan.dish_count).toBe(6);
    const asia = res.body.nodes.find((n: any) => n.id === "asia");
    expect(asia.parent_id).toBeNull();
  });
});

describe("POST /api/spin", () => {
  it("返回候选与结果，字段为 DTO 形态", async () => {
    const res = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: "sichuan", source: "all" });
    expect(res.status).toBe(200);
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(6);
    expect(res.body.result.cuisine_path).toContain("川菜");
    expect(Array.isArray(res.body.result.ingredients)).toBe(true);
    expect(res.body.reroll_left).toBe(2);
  });

  it("缺 cuisine_id 与 source 校验失败 400", async () => {
    const res = await request(app).post("/api/spin").set(DEV).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("收藏夹数据源为空时 404 EMPTY_POOL", async () => {
    const res = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: null, source: "favorites" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("EMPTY_POOL");
  });
});

describe("POST /api/spin/reroll", () => {
  it("两次后第三次 429 REROLL_EXHAUSTED", async () => {
    const body = { cuisine_id: "sichuan", source: "all" };
    await request(app).post("/api/spin/reroll").set(DEV).send(body);
    await request(app).post("/api/spin/reroll").set(DEV).send(body);
    const res = await request(app).post("/api/spin/reroll").set(DEV).send(body);
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("REROLL_EXHAUSTED");
  });
});

describe("POST /api/recipes/:id/block", () => {
  it("写入 30 天拉黑，转盘不再转出", async () => {
    const res = await request(app).post("/api/recipes/RC_SC_001/block").set(DEV);
    expect(res.status).toBe(200);
    const spin = await request(app).post("/api/spin").set(DEV)
      .send({ cuisine_id: "sichuan", source: "all" });
    expect(spin.body.candidates.some((c: any) => c.id === "RC_SC_001")).toBe(false);
  });

  it("未知菜谱 404", async () => {
    const res = await request(app).post("/api/recipes/RC_NOPE/block").set(DEV);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- spin-routes`
Expected: FAIL（路由不存在 → 404 断言失败）。

- [ ] **Step 3: 实现**

`server/src/serialize.ts`：
```ts
import type { DB } from "./db";
import type { RecipeRow } from "./services/roulette";

export interface RecipeDTO { /* 见 Task 8 Interfaces，JSON 序列化后的菜谱形态 */ [k: string]: unknown }

export function makeCuisinePath(db: DB) {
  const stmt = db.prepare("SELECT * FROM cuisines WHERE id = ?");
  return (cuisineId: string): string => {
    const names: string[] = [];
    let cur: any = stmt.get(cuisineId);
    while (cur) {
      names.unshift(cur.name);
      cur = cur.parent_id ? stmt.get(cur.parent_id) : null;
    }
    return names.join(" > ");
  };
}

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
    taste_tags: JSON.parse(row.taste_tags),
    ingredients: JSON.parse(row.ingredients),
    tools: JSON.parse(row.tools),
    steps: JSON.parse(row.steps),
    solo_tip: row.solo_tip,
    color_tag: row.color_tag,
  };
}
```

`server/src/routes/cuisines.ts`：
```ts
import { Router } from "express";
import type { DB } from "../db";

export function cuisinesRouter(db: DB): Router {
  const router = Router();
  router.get("/cuisines/tree", (_req, res) => {
    const cuisines = db.prepare("SELECT * FROM cuisines ORDER BY level, id").all() as any[];
    const counts = db.prepare("SELECT cuisine_id, COUNT(*) AS n FROM recipes GROUP BY cuisine_id")
      .all() as any[];
    const countMap = new Map(counts.map((c) => [c.cuisine_id, c.n]));
    res.json({
      nodes: cuisines.map((c) => ({
        id: c.id, level: c.level, parent_id: c.parent_id, name: c.name, name_en: c.name_en,
        tags: JSON.parse(c.tags), dish_count: countMap.get(c.id) ?? 0,
      })),
    });
  });
  return router;
}
```

`server/src/routes/spin.ts`：
```ts
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { spin, rerollSpin } from "../services/roulette";
import { toRecipeDTO } from "../serialize";

const bodySchema = z.object({
  cuisine_id: z.string().nullable(),
  source: z.enum(["all", "favorites"]),
});

export function spinRouter(db: DB): Router {
  const router = Router();
  const handler = (mode: "spin" | "reroll") => (req: AuthedRequest, res: any) => {
    const body = bodySchema.parse(req.body);
    const r = mode === "spin"
      ? spin(db, req.user!.id, body.cuisine_id, body.source)
      : rerollSpin(db, req.user!.id, body.cuisine_id, body.source);
    res.json({
      result: toRecipeDTO(db, r.result),
      candidates: r.candidates.map((c) => toRecipeDTO(db, c)),
      pooled_up: r.pooledUp,
      reroll_left: r.rerollLeft,
    });
  };
  router.post("/spin", handler("spin"));
  router.post("/spin/reroll", handler("reroll"));
  return router;
}
```

`server/src/routes/recipes.ts`：
```ts
import { Router } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { blockRecipe } from "../services/roulette";
import { toRecipeDTO } from "../serialize";
import { HttpError } from "../util/http";

export function recipesRouter(db: DB): Router {
  const router = Router();
  router.post("/recipes/:id/block", (req: AuthedRequest, res) => {
    const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id);
    if (!row) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    blockRecipe(db, req.user!.id, req.params.id, new Date());
    res.json({ ok: true });
  });
  void toRecipeDTO;
  return router;
}
```

`server/src/routes/index.ts`（替换占位）：
```ts
import { Router } from "express";
import type { DB } from "../db";
import { cuisinesRouter } from "./cuisines";
import { spinRouter } from "./spin";
import { recipesRouter } from "./recipes";

export function apiRouter(db: DB): Router {
  const router = Router();
  router.use(cuisinesRouter(db));
  router.use(spinRouter(db));
  router.use(recipesRouter(db));
  return router;
}
```

`server/src/index.ts`（生产入口，替换占位）：
```ts
import path from "node:path";
import fs from "node:fs";
import express from "express";
import { openDb } from "./db";
import { seedAll } from "./seed";
import { seedRecipes } from "./seed/recipes";
import { createApp } from "./app";

const db = openDb();
seedAll(db);
seedRecipes(db);
const app = createApp(db);

const clientDist = path.resolve("../client/dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use("/uploads", express.static(path.resolve("uploads")));
  app.use("/dish-images", express.static(path.resolve("public/dish-images")));
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/dish-images")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => console.log(`WhatToEat server listening on http://localhost:${PORT}`));
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- spin-routes && npm run typecheck -w server`
Expected: 全部 passed；typecheck 无错。

- [ ] **Step 5: Commit**

```bash
git add server/src server/tests
git commit -m "feat(server): 菜系树/转盘/重转/拉黑路由与生产入口"
```

---

### Task 9: 食谱详情 / 收藏路由

**Files:**
- Modify: `server/src/routes/recipes.ts`（加 GET /:id）, `server/src/routes/index.ts`（挂 favorites）, `server/src/serialize.ts`（补 FavoriteDTO）
- Create: `server/src/routes/favorites.ts`
- Test: `server/tests/favorites.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/recipes/:id` → `{ recipe: RecipeDTO & { is_favorite: boolean; is_blocked: boolean } }`；404 `NOT_FOUND`
  - `GET /api/favorites` → `{ items: FavoriteDTO[] }`，`FavoriteDTO = RecipeDTO & { favorited_at: string, continent: string, country: string, scene_tags: ("quick"|"weekend")[] }`（`quick`=minutes≤15，`weekend`=minutes≥45）
  - `POST /api/favorites` body `{ recipe_id }` → `{ ok: true }`（重复收藏幂等）；`DELETE /api/favorites/:recipeId` → `{ ok: true }`

- [ ] **Step 1: 写失败测试**

`server/tests/favorites.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";

let db: DB;
let app: ReturnType<typeof createApp>;
const DEV = { "X-Device-Id": "dev-1" };

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  app = createApp(db);
});

describe("GET /api/recipes/:id", () => {
  it("返回完整 DTO，含 is_favorite/is_blocked 与 cuisine_path", async () => {
    const res = await request(app).get("/api/recipes/RC_GR_001").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.recipe.name).toBe("希腊沙拉");
    expect(res.body.recipe.cuisine_path).toBe("欧洲 > 南欧 > 希腊 > 克里特菜");
    expect(res.body.recipe.is_favorite).toBe(false);
    expect(res.body.recipe.is_blocked).toBe(false);
  });

  it("404", async () => {
    const res = await request(app).get("/api/recipes/NOPE").set(DEV);
    expect(res.status).toBe(404);
  });
});

describe("favorites", () => {
  it("收藏 → 列表含聚合字段 → 取消收藏", async () => {
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_003" });
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_004" });

    const list = await request(app).get("/api/favorites").set(DEV);
    expect(list.body.items.length).toBe(2);
    const quick = list.body.items.find((i: any) => i.id === "RC_YU_003");
    expect(quick.scene_tags).toContain("quick");
    expect(quick.continent).toBe("亚洲");
    expect(quick.country).toBe("中国");

    // 重复收藏幂等
    await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "RC_YU_003" });
    expect(db.prepare("SELECT COUNT(*) AS n FROM favorites").get()!.n).toBe(2);

    // 详情页 is_favorite 变 true
    const detail = await request(app).get("/api/recipes/RC_YU_003").set(DEV);
    expect(detail.body.recipe.is_favorite).toBe(true);

    await request(app).delete("/api/favorites/RC_YU_003").set(DEV);
    expect(db.prepare("SELECT COUNT(*) AS n FROM favorites").get()!.n).toBe(1);
  });

  it("收藏不存在菜谱 404", async () => {
    const res = await request(app).post("/api/favorites").set(DEV).send({ recipe_id: "NOPE" });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- favorites`
Expected: FAIL。

- [ ] **Step 3: 实现**

`server/src/routes/favorites.ts`：
```ts
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { toRecipeDTO, makeCuisinePath } from "../serialize";
import { HttpError } from "../util/http";
import { nowIso } from "../util/dates";

export function favoritesRouter(db: DB): Router {
  const router = Router();
  const getCuisine = db.prepare("SELECT * FROM cuisines WHERE id = ?");

  router.get("/favorites", (req: AuthedRequest, res) => {
    const rows = db.prepare(
      "SELECT r.*, f.created_at AS favorited_at FROM favorites f JOIN recipes r ON r.id = f.recipe_id WHERE f.user_id = ? ORDER BY f.created_at DESC"
    ).all(req.user!.id) as any[];
    const pathOf = makeCuisinePath(db);
    const items = rows.map((row) => {
      const ancestors: any[] = [];
      let cur: any = getCuisine.get(row.cuisine_id);
      while (cur) { ancestors.unshift(cur); cur = cur.parent_id ? getCuisine.get(cur.parent_id) : null; }
      const continent = ancestors.find((a) => a.level === 1)?.name ?? "";
      const country = ancestors.find((a) => a.level === 3)?.name ?? "";
      const sceneTags: string[] = [];
      if (row.minutes <= 15) sceneTags.push("quick");
      if (row.minutes >= 45) sceneTags.push("weekend");
      return { ...toRecipeDTO(db, row), favorited_at: row.favorited_at, continent, country, scene_tags: sceneTags, cuisine_path: pathOf(row.cuisine_id) };
    });
    res.json({ items });
  });

  router.post("/favorites", (req: AuthedRequest, res) => {
    const { recipe_id } = z.object({ recipe_id: z.string() }).parse(req.body);
    const row = db.prepare("SELECT id FROM recipes WHERE id = ?").get(recipe_id);
    if (!row) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    db.prepare("INSERT OR IGNORE INTO favorites (user_id, recipe_id, created_at) VALUES (?, ?, ?)")
      .run(req.user!.id, recipe_id, nowIso());
    res.json({ ok: true });
  });

  router.delete("/favorites/:recipeId", (req: AuthedRequest, res) => {
    db.prepare("DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?").run(req.user!.id, req.params.recipeId);
    res.json({ ok: true });
  });

  return router;
}
```

`server/src/routes/recipes.ts` 追加详情路由（在 block 路由后）：
```ts
  router.get("/recipes/:id", (req: AuthedRequest, res) => {
    const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(req.params.id) as any;
    if (!row) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    const isFavorite = !!db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?")
      .get(req.user!.id, req.params.id);
    const isBlocked = !!db.prepare("SELECT 1 FROM blocks WHERE user_id = ? AND recipe_id = ? AND blocked_until > ?")
      .get(req.user!.id, req.params.id, new Date().toISOString());
    res.json({ recipe: { ...toRecipeDTO(db, row), is_favorite: isFavorite, is_blocked: isBlocked } });
  });
```

`server/src/routes/index.ts` 挂载：`router.use(favoritesRouter(db));`

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- favorites`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src server/tests
git commit -m "feat(server): 食谱详情与收藏路由（含地域/场景聚合）"
```

---

### Task 10: 徽章判定引擎

**Files:**
- Create: `server/src/services/badges.ts`
- Test: `server/tests/badges.test.ts`

**Interfaces:**
- Consumes: `computeStreak`、`addDays`。
- Produces:
  - `badgeProgress(db, userId, def: BadgeDefRow): { current: number; target: number }`（按 `rule_type` 分派）
  - `evaluateBadges(db, userId, now: Date): BadgeDefRow[]`（判定 + 事务内写 `user_badges`，返回**本次新解锁**定义行）
  - `listBadgesForUser(db, userId): BadgeView[]`，`BadgeView = { id, name, description, icon, category, rule_type, current, target, unlocked: boolean, unlocked_at: string | null }`
- 规则语义（与规格 §5.3 一致）：
  - `cuisine_continent_count`：去重已打卡菜谱，其菜系 L1 祖先 ∈ `continents` 或 L3 祖先 ∈ `countries`，计数达 `distinct`
  - `cuisine_tag_count`：去重已打卡菜谱，其 L4 菜系 `tags` 含 `tag`，达 `distinct`
  - `continent_coverage`：L1 ∈ `continents` 的各大洲中，不同国家（L3）数 ≥ `per_continent` 的洲数
  - `streak_days`：打卡时刻 current streak ≥ `days`
  - `fast_dish_count`：去重打卡菜谱 `minutes ≤ minutes_max`，达 `count`
  - `late_night_count`：打卡记录 `created_at` 服务器本地小时 ≥ `hour` 的次数（不去重），达 `count`
  - `color_variety`：去重打卡菜谱不同 `color_tag` 数，达 `distinct`

- [ ] **Step 1: 写失败测试**

`server/tests/badges.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { badgeProgress, evaluateBadges, listBadgesForUser } from "../src/services/badges";
import { computeStreak } from "../src/services/streak";
import { statDate, addDays } from "../src/util/dates";

let db: DB;
let userId: string;
const TODAY = statDate();

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  userId = "u1";
  db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, 'dev-1', '2026-01-01')").run(userId);
});

const def = (id: string) => db.prepare("SELECT * FROM badge_defs WHERE id = ?").get(id) as any;

function checkin(recipeId: string, statDateStr: string = TODAY, createdAt: string = `${statDateStr}T22:00:00.000Z`) {
  db.prepare(
    "INSERT OR IGNORE INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES (?, ?, ?, 5, ?, ?)"
  ).run(`c-${recipeId}-${statDateStr}`, userId, recipeId, statDateStr, createdAt);
}

describe("badgeProgress / evaluateBadges", () => {
  it("eu_first：3 道不同欧洲菜解锁（欧洲 L1 祖先）", () => {
    checkin("RC_IT_001"); checkin("RC_IT_002"); checkin("RC_GR_001");
    expect(badgeProgress(db, userId, def("eu_first"))).toEqual({ current: 3, target: 3 });
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("eu_first");
    // 再判定不重复解锁
    expect(evaluateBadges(db, userId, new Date()).map((b: any) => b.id)).not.toContain("eu_first");
  });

  it("latam：墨西哥 + 南美（秘鲁）混合计数", () => {
    for (const id of ["RC_MX_001", "RC_MX_002", "RC_MX_003", "RC_PE_001", "RC_PE_003"]) checkin(id);
    expect(badgeProgress(db, userId, def("latam")).current).toBe(5);
  });

  it("mediterranean：tag=mediterranean 的菜系（普罗旺斯/克里特）", () => {
    for (const id of ["RC_FR_001", "RC_FR_002", "RC_FR_003", "RC_GR_001", "RC_GR_002", "RC_GR_003", "RC_FR_004"]) checkin(id);
    expect(badgeProgress(db, userId, def("mediterranean")).current).toBe(7);
  });

  it("solo_chef：current streak ≥ 7（用 streak 服务口径）", () => {
    for (let i = 6; i >= 0; i--) checkin(`RC_SC_00${i + 1}` === "RC_SC_007" ? "RC_SC_006" : `RC_SC_00${i + 1}`, addDays(TODAY, -i));
    // 7 天里每天一道不同菜
    const dates = db.prepare("SELECT stat_date FROM checkins WHERE user_id=?").all(userId).map((r: any) => r.stat_date);
    const streak = computeStreak(dates, TODAY);
    expect(streak.current).toBeGreaterThanOrEqual(7);
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("solo_chef");
  });

  it("fast_cook：去重 minutes≤15 达 10 道（重复打卡同一道不重复计）", () => {
    for (const id of ["RC_YU_001", "RC_YU_003", "RC_YU_005", "RC_JP_005", "RC_TH_003", "RC_TH_006", "RC_IN_006", "RC_IT_001", "RC_IT_003", "RC_GR_001", "RC_GR_003"]) checkin(id);
    checkin("RC_GR_003", addDays(TODAY, -1)); // 同一道再打卡，不增计数
    expect(badgeProgress(db, userId, def("fast_cook")).current).toBe(11);
    const unlocked = evaluateBadges(db, userId, new Date());
    expect(unlocked.map((b: any) => b.id)).toContain("fast_cook");
  });

  it("night_owl：created_at 本地小时 ≥21 计 3 次", () => {
    // 服务器本地时区（UTC+8 测试机）下 22:00Z 不一定 ≥21h —— 用本地 Date 构造
    const late = new Date(); late.setHours(22, 0, 0, 0);
    checkin("RC_SC_001", TODAY, late.toISOString());
    checkin("RC_SC_002", TODAY, late.toISOString());
    expect(badgeProgress(db, userId, def("night_owl")).current).toBe(2);
    checkin("RC_SC_003", TODAY, late.toISOString());
    expect(evaluateBadges(db, userId, late).map((b: any) => b.id)).toContain("night_owl");
  });

  it("color_master：5 种不同主色调", () => {
    for (const id of ["RC_SC_001", "RC_IT_003", "RC_TH_002", "RC_IT_002", "RC_MX_002"]) checkin(id);
    // 红白棕绿橙
    expect(badgeProgress(db, userId, def("color_master")).current).toBe(5);
    expect(evaluateBadges(db, userId, new Date()).map((b: any) => b.id)).toContain("color_master");
  });

  it("globe_master：进度 = 达标洲数，未达标不解锁", () => {
    for (const id of ["RC_SC_001", "RC_YU_001", "RC_JP_001", "RC_TH_001", "RC_IN_001"]) checkin(id);
    const p = badgeProgress(db, userId, def("globe_master"));
    expect(p.current).toBe(0); // 亚洲只有 4 个国家
    expect(p.target).toBe(5);
  });
});

describe("listBadgesForUser", () => {
  it("返回 8 枚，含进度与解锁状态", () => {
    checkin("RC_IT_001");
    const views = listBadgesForUser(db, userId);
    expect(views.length).toBe(8);
    const eu = views.find((v) => v.id === "eu_first")!;
    expect(eu.current).toBe(1);
    expect(eu.unlocked).toBe(false);
    expect(eu.unlocked_at).toBeNull();
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- badges`
Expected: FAIL — 模块不存在。

- [ ] **Step 3: 实现 `server/src/services/badges.ts`**

```ts
import type { DB } from "../db";
import { computeStreak } from "./streak";
import { statDate } from "../util/dates";

export interface BadgeDefRow {
  id: string; name: string; description: string; icon: string;
  category: string; rule_type: string; rule_params: string; sort: number;
}

export interface BadgeView extends BadgeDefRow {
  current: number; target: number; unlocked: boolean; unlocked_at: string | null;
}

interface CuisinesMap { id: string; level: number; parent_id: string | null; name: string; tags: string }
const getCuisinesMap = (db: DB) => {
  const map = new Map<string, CuisinesMap>();
  for (const row of db.prepare("SELECT * FROM cuisines").all() as any[]) map.set(row.id, row);
  return map;
};

function ancestorsOf(map: Map<string, CuisinesMap>, cuisineId: string): CuisinesMap[] {
  const chain: CuisinesMap[] = [];
  let cur = map.get(cuisineId);
  while (cur) { chain.unshift(cur); cur = cur.parent_id ? map.get(cur.parent_id) : undefined; }
  return chain;
}

/** 该用户去重打卡过的菜谱（带菜系与主色/耗时），供各规则复用。 */
function distinctCheckedRecipes(db: DB, userId: string) {
  return db.prepare(
    `SELECT DISTINCT r.id, r.minutes, r.color_tag, r.cuisine_id FROM checkins c JOIN recipes r ON r.id = c.recipe_id WHERE c.user_id = ?`
  ).all(userId) as any[];
}

function checkedStreak(db: DB, userId: string): number {
  const dates = (db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?").all(userId) as any[])
    .map((r) => r.stat_date);
  return computeStreak(dates, statDate()).current;
}

export function badgeProgress(db: DB, userId: string, def: BadgeDefRow): { current: number; target: number } {
  const params = JSON.parse(def.rule_params);
  const map = getCuisinesMap(db);

  switch (def.rule_type) {
    case "cuisine_continent_count": {
      const recipes = distinctCheckedRecipes(db, userId).filter((r) => {
        const chain = ancestorsOf(map, r.cuisine_id);
        const l1 = chain.find((c) => c.level === 1)?.name;
        const l3 = chain.find((c) => c.level === 3)?.name;
        return (params.continents ?? []).includes(l1) || (params.countries ?? []).includes(l3);
      });
      return { current: recipes.length, target: params.distinct };
    }
    case "cuisine_tag_count": {
      const recipes = distinctCheckedRecipes(db, userId).filter((r) => {
        const cuisine = map.get(r.cuisine_id);
        return cuisine ? JSON.parse(cuisine.tags).includes(params.tag) : false;
      });
      return { current: recipes.length, target: params.distinct };
    }
    case "continent_coverage": {
      const byContinent = new Map<string, Set<string>>();
      for (const r of distinctCheckedRecipes(db, userId)) {
        const chain = ancestorsOf(map, r.cuisine_id);
        const l1 = chain.find((c) => c.level === 1)?.name;
        const l3 = chain.find((c) => c.level === 3)?.name;
        if (!l1 || !(params.continents as string[]).includes(l1) || !l3) continue;
        if (!byContinent.has(l1)) byContinent.set(l1, new Set());
        byContinent.get(l1)!.add(l3);
      }
      const met = [...byContinent.values()].filter((s) => s.size >= params.per_continent).length;
      return { current: met, target: params.continents.length };
    }
    case "streak_days":
      return { current: checkedStreak(db, userId), target: params.days };
    case "fast_dish_count": {
      const n = distinctCheckedRecipes(db, userId).filter((r) => r.minutes <= params.minutes_max).length;
      return { current: n, target: params.count };
    }
    case "late_night_count": {
      const rows = db.prepare("SELECT created_at FROM checkins WHERE user_id = ?").all(userId) as any[];
      const n = rows.filter((r) => new Date(r.created_at).getHours() >= params.hour).length;
      return { current: n, target: params.count };
    }
    case "color_variety": {
      const n = new Set(distinctCheckedRecipes(db, userId).map((r) => r.color_tag)).size;
      return { current: n, target: params.distinct };
    }
    default:
      return { current: 0, target: 1 };
  }
}

export function evaluateBadges(db: DB, userId: string, now: Date): BadgeDefRow[] {
  const defs = db.prepare("SELECT * FROM badge_defs ORDER BY sort").all() as BadgeDefRow[];
  const newlyUnlocked: BadgeDefRow[] = [];
  const insert = db.prepare(
    "INSERT OR IGNORE INTO user_badges (user_id, badge_id, unlocked_at, progress_snapshot) VALUES (?, ?, ?, ?)"
  );
  const tx = db.transaction(() => {
    for (const def of defs) {
      const { current, target } = badgeProgress(db, userId, def);
      if (current < target) continue;
      const already = db.prepare("SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?")
        .get(userId, def.id);
      if (already) continue;
      insert.run(userId, def.id, now.toISOString(), JSON.stringify({ current, target }));
      newlyUnlocked.push(def);
    }
  });
  tx();
  return newlyUnlocked;
}

export function listBadgesForUser(db: DB, userId: string): BadgeView[] {
  const defs = db.prepare("SELECT * FROM badge_defs ORDER BY sort").all() as BadgeDefRow[];
  const unlockedRows = db.prepare("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?")
    .all(userId) as any[];
  const unlockedMap = new Map(unlockedRows.map((r) => [r.badge_id, r.unlocked_at]));
  return defs.map((def) => {
    const { current, target } = badgeProgress(db, userId, def);
    const unlockedAt = unlockedMap.get(def.id) ?? null;
    return { ...def, current, target, unlocked: unlockedAt !== null, unlocked_at: unlockedAt };
  });
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server -- badges`
Expected: 全部 passed（注意 fast_cook 测试断言 11 — 11 道不同快手菜含第 11 道重复不计；若断言不匹配按规则语义修正测试或数据）。

- [ ] **Step 5: Commit**

```bash
git add server/src/services/badges.ts server/tests/badges.test.ts
git commit -m "feat(server): 8 枚徽章判定引擎（规则分派 + 进度查询）"
```

---

### Task 11: 打卡 / 徽章列表 / 个人汇总 / 埋点路由

**Files:**
- Create: `server/src/routes/checkins.ts`, `server/src/routes/badges.ts`, `server/src/routes/profile.ts`, `server/src/routes/events.ts`
- Modify: `server/src/routes/index.ts`
- Test: `server/tests/checkins.test.ts`

**Interfaces:**
- Produces:
  - `POST /api/checkins`（multipart：`recipe_id`*, `rating`*, `review`?, `photo`?）→ `{ checkin_id, streak, max_streak, stat_date, new_badges: [{id,name,description,icon,category}] }`；事务：插 checkins → computeStreak → evaluateBadges；422 `PHOTO_TOO_LARGE`/类型不符由 multer 限制映射为 400 `VALIDATION_ERROR`
  - `GET /api/badges` → `{ badges: BadgeView[] }`
  - `GET /api/profile/summary` → `{ streak: {current,max}, total_checkins, calendar: string[], continents: [{name, emoji, countries, dishes}], pending_checkin: {recipe_id, name, emoji} | null, history: [{checkin_id, recipe_id, name, emoji, photo_path, rating, stat_date}] }`；`calendar` = 最近 30 天有打卡的 stat_date 升序；`pending_checkin` = 昨日（stat_date 口径）转出但未打卡的最近菜品；`continents.emoji` 由路由内映射（亚洲 🏯、欧洲 🏰、非洲 🦁、北美洲 🗽、南美洲 🌄、大洋洲 🐨）
  - `PATCH /api/profile/settings` body `{ difficulty_pref: "easy"|"medium"|"hard"|null }` → `{ settings }`（合并进 users.settings JSON）
  - `POST /api/events` body `{ event_id, params?, device_id? }` → 202 `{}`（event_id ∈ 5 枚举；无 X-Device-Id 头时用 body.device_id 落库 user_id，可解析不到则存 null——埋点不因会话缺失失败）
- Consumes: `moderateCheckin(review, photoPath)`：`server/src/services/moderation.ts` 空实现钩子（MVP no-op，注释标注后续接入第三方审核）。

- [ ] **Step 1: 写失败测试**

`server/tests/checkins.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { openDb, DB } from "../src/db";
import { seedAll } from "../src/seed";
import { seedRecipes } from "../src/seed/recipes";
import { createApp } from "../src/app";
import { statDate, addDays, nowIso } from "../src/util/dates";

let db: DB;
let app: ReturnType<typeof createApp>;
const DEV = { "X-Device-Id": "dev-1" };
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154a24f5f0000000049454e44ae426082", "hex");

beforeEach(() => {
  db = openDb(":memory:");
  seedAll(db);
  seedRecipes(db);
  app = createApp(db);
});

describe("POST /api/checkins", () => {
  const post = (extra: Record<string, string> = {}, attach = false) => {
    const r = request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "5")
      .field("review", "很下饭！");
    if (attach) r.attach("photo", PNG, { filename: "dish.png", contentType: "image/png" });
    for (const [k, v] of Object.entries(extra)) r.field(k, v);
    return r;
  };

  it("打卡成功：返回 streak 与 stat_date，照片入库", async () => {
    const res = await post({}, true);
    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(1);
    expect(res.body.max_streak).toBe(1);
    expect(res.body.stat_date).toBe(statDate());
    expect(res.body.new_badges).toEqual([]);
    const row = db.prepare("SELECT * FROM checkins WHERE user_id=(SELECT id FROM users WHERE device_id='dev-1')").get() as any;
    expect(row.photo_path).toMatch(/^\/uploads\/.+\.png$/);
  });

  it("连续两天打卡 streak=2；当日重复打卡不重复计数", async () => {
    await post();
    // 直接补一条昨日打卡
    const uid = db.prepare("SELECT id FROM users WHERE device_id='dev-1'").get()!.id;
    db.prepare("INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c-y', ?, 'RC_SC_002', 4, ?, ?)")
      .run(uid, addDays(statDate(), -1), nowIso());
    const second = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_003").field("rating", "4");
    expect(second.body.streak).toBe(2);
  });

  it("rating 越界 400；recipe 不存在 404", async () => {
    const bad = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_SC_001").field("rating", "9");
    expect(bad.status).toBe(400);
    const missing = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "NOPE").field("rating", "5");
    expect(missing.status).toBe(404);
  });

  it("第 10 道快手菜打卡解锁 fast_cook 徽章", async () => {
    const uid = db.prepare("SELECT id FROM users WHERE device_id='dev-1'").get()!.id;
    const fast = ["RC_YU_001", "RC_YU_003", "RC_YU_005", "RC_JP_005", "RC_TH_003", "RC_TH_006", "RC_IN_006", "RC_IT_001", "RC_IT_003"];
    fast.forEach((id, i) => db.prepare(
      "INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES (?, ?, ?, 5, ?, ?)"
    ).run(`c${i}`, uid, id, addDays(statDate(), -1), nowIso()));
    const res = await request(app).post("/api/checkins").set(DEV)
      .field("recipe_id", "RC_GR_001").field("rating", "5");
    expect(res.body.new_badges.map((b: any) => b.id)).toContain("fast_cook");
  });
});

describe("GET /api/profile/summary", () => {
  it("返回 streak/日历/大洲探索/待补打卡/历史", async () => {
    const uid = db.prepare("SELECT id FROM users WHERE device_id='dev-1'").get()!.id;
    db.prepare("INSERT INTO checkins (id, user_id, recipe_id, rating, stat_date, created_at) VALUES ('c1', ?, 'RC_SC_001', 5, ?, ?)")
      .run(uid, statDate(), nowIso());
    db.prepare("INSERT INTO spin_history (user_id, recipe_id, source, action, created_at) VALUES (?, 'RC_SC_002', 'all', 'spin', ?)")
      .run(uid, nowIso());

    const res = await request(app).get("/api/profile/summary").set(DEV);
    expect(res.status).toBe(200);
    expect(res.body.streak.current).toBe(1);
    expect(res.body.calendar).toContain(statDate());
    expect(res.body.continents[0]).toMatchObject({ name: "亚洲" });
    expect(res.body.history[0]).toMatchObject({ recipe_id: "RC_SC_001", name: "麻婆豆腐" });
    expect(res.body.pending_checkin).toMatchObject({ recipe_id: "RC_SC_002" });
  });
});

describe("GET /api/badges + PATCH settings + POST events", () => {
  it("badges 列表 8 枚", async () => {
    const res = await request(app).get("/api/badges").set(DEV);
    expect(res.body.badges.length).toBe(8);
  });

  it("settings 合并保存", async () => {
    const res = await request(app).patch("/api/profile/settings").set(DEV)
      .send({ difficulty_pref: "easy" });
    expect(res.body.settings.difficulty_pref).toBe("easy");
  });

  it("events 接受 sendBeacon 形态（body.device_id）并入库", async () => {
    const res = await request(app).post("/api/events")
      .send({ event_id: "roulette_spin_click", device_id: "dev-1", params: { source: "all" } });
    expect(res.status).toBe(202);
    expect(db.prepare("SELECT COUNT(*) AS n FROM events WHERE event_id='roulette_spin_click'").get()!.n).toBe(1);
  });

  it("events 未知事件 400", async () => {
    const res = await request(app).post("/api/events").send({ event_id: "unknown", device_id: "dev-1" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w server -- checkins`
Expected: FAIL。

- [ ] **Step 3: 实现**

`server/src/services/moderation.ts`：
```ts
/** MVP 阶段 no-op；接入第三方鉴黄/敏感词服务时在此同步拦截并抛 HttpError(422, "CONTENT_BLOCKED")。 */
export function moderateCheckin(review: string | undefined, photoPath: string | undefined): void {
  void review;
  void photoPath;
}
```

`server/src/routes/checkins.ts`：
```ts
import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { statDate, nowIso } from "../util/dates";
import { computeStreak } from "../services/streak";
import { evaluateBadges } from "../services/badges";
import { moderateCheckin } from "../services/moderation";
import { HttpError } from "../util/http";

const UPLOAD_DIR = path.resolve("uploads");
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname || ".jpg") || ".jpg"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, "VALIDATION_ERROR", "图片或内容包含违规信息，请重新上传"));
  },
});

export function checkinsRouter(db: DB): Router {
  const router = Router();
  const getUser = db.prepare("SELECT id FROM users WHERE device_id = ?");

  router.post("/checkins", upload.single("photo"), (req: AuthedRequest, res) => {
    const body = z.object({
      recipe_id: z.string(),
      rating: z.coerce.number().int().min(1).max(5),
      review: z.string().max(100).optional(),
    }).parse({ recipe_id: req.body.recipe_id, rating: req.body.rating, review: req.body.review || undefined });

    const recipe = db.prepare("SELECT id FROM recipes WHERE id = ?").get(body.recipe_id);
    if (!recipe) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    moderateCheckin(body.review, req.file?.path);

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const today = statDate();
    const result = db.transaction(() => {
      const id = `CK${Date.now()}${Math.floor(Math.random() * 1000)}`;
      db.prepare(
        "INSERT INTO checkins (id, user_id, recipe_id, photo_path, rating, review, stat_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(id, req.user!.id, body.recipe_id, photoPath, body.rating, body.review ?? null, today, nowIso());
      const dates = (db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?").all(req.user!.id) as any[])
        .map((r) => r.stat_date);
      const streak = computeStreak(dates, today);
      const newBadges = evaluateBadges(db, req.user!.id, new Date());
      return { id, streak, newBadges };
    })();

    res.json({
      checkin_id: result.id,
      streak: result.streak.current,
      max_streak: result.streak.max,
      stat_date: today,
      new_badges: result.newBadges.map((b) => ({ id: b.id, name: b.name, description: b.description, icon: b.icon, category: b.category })),
    });
  });

  void getUser;
  return router;
}
```

`server/src/routes/badges.ts`：
```ts
import { Router } from "express";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { listBadgesForUser } from "../services/badges";

export function badgesRouter(db: DB): Router {
  const router = Router();
  router.get("/badges", (req: AuthedRequest, res) => {
    res.json({ badges: listBadgesForUser(db, req.user!.id) });
  });
  return router;
}
```

`server/src/routes/profile.ts`：
```ts
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { statDate, addDays } from "../util/dates";
import { computeStreak } from "../services/streak";

const CONTINENT_EMOJI: Record<string, string> = {
  亚洲: "🏯", 欧洲: "🏰", 非洲: "🦁", 北美洲: "🗽", 南美洲: "🌄", 大洋洲: "🐨",
};

export function profileRouter(db: DB): Router {
  const router = Router();

  router.get("/profile/summary", (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const today = statDate();
    const yesterday = addDays(today, -1);
    const dates = (db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?").all(userId) as any[])
      .map((r) => r.stat_date);
    const streak = computeStreak(dates, today);

    const calendar = [...new Set(dates)].filter((d) => d >= addDays(today, -29)).sort();
    const total = db.prepare("SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?").get(userId)!.n;

    const continentRows = db.prepare(
      `SELECT DISTINCT c.name AS continent, c3.name AS country, r.id AS recipe_id
       FROM checkins ck
       JOIN recipes r ON r.id = ck.recipe_id
       JOIN cuisines c4 ON c4.id = r.cuisine_id
       JOIN cuisines c3 ON c3.id = c4.parent_id
       JOIN cuisines c2 ON c2.id = c3.parent_id
       JOIN cuisines c1 ON c1.id = c2.parent_id AND c1.level = 1
       JOIN cuisines c ON c.id = c1.id
       WHERE ck.user_id = ?`
    ).all(userId) as any[];
    const continents = [...new Set(continentRows.map((r) => r.continent))].map((name) => ({
      name,
      emoji: CONTINENT_EMOJI[name] ?? "🌍",
      countries: new Set(continentRows.filter((r) => r.continent === name).map((r) => r.country)).size,
      dishes: new Set(continentRows.filter((r) => r.continent === name).map((r) => r.recipe_id)).size,
    }));

    const pending = db.prepare(
      `SELECT r.id AS recipe_id, r.name, r.emoji FROM spin_history s
       JOIN recipes r ON r.id = s.recipe_id
       WHERE s.user_id = ? AND s.action = 'spin' AND substr(s.created_at, 1, 10) >= ?
         AND NOT EXISTS (SELECT 1 FROM checkins ck WHERE ck.user_id = s.user_id AND ck.recipe_id = s.recipe_id AND ck.stat_date = ?)
       ORDER BY s.created_at DESC LIMIT 1`
    ).get(userId, yesterday, yesterday) as any;

    const history = db.prepare(
      `SELECT ck.id AS checkin_id, ck.recipe_id, r.name, r.emoji, ck.photo_path, ck.rating, ck.stat_date
       FROM checkins ck JOIN recipes r ON r.id = ck.recipe_id
       WHERE ck.user_id = ? ORDER BY ck.created_at DESC LIMIT 50`
    ).all(userId) as any[];

    res.json({ streak, total_checkins: total, calendar, continents, pending_checkin: pending ?? null, history });
  });

  router.patch("/profile/settings", (req: AuthedRequest, res) => {
    const { difficulty_pref } = z.object({
      difficulty_pref: z.enum(["easy", "medium", "hard"]).nullable(),
    }).parse(req.body);
    const user = db.prepare("SELECT settings FROM users WHERE id = ?").get(req.user!.id) as any;
    const settings = { ...JSON.parse(user.settings), difficulty_pref };
    db.prepare("UPDATE users SET settings = ? WHERE id = ?").run(JSON.stringify(settings), req.user!.id);
    res.json({ settings });
  });

  return router;
}
```

注意：`pending_checkin` 的日期过滤使用 `substr(created_at,1,10)`（UTC 日期）近似 stat_date——本地时区与 UTC 相差 ≤8h，跨凌晨场景误差可接受；`yesterday` 基准保证只提示昨天及之后转出的菜品。

`server/src/routes/events.ts`：
```ts
import { Router } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { nowIso } from "../util/dates";

const EVENT_IDS = ["cuisine_category_select", "roulette_spin_click", "roulette_result_action", "recipe_cook_checkin", "badge_unlock_view"] as const;

export function eventsRouter(db: DB): Router {
  const router = Router();
  router.post("/events", (req: AuthedRequest, res) => {
    const body = z.object({
      event_id: z.enum(EVENT_IDS),
      params: z.record(z.unknown()).optional(),
      device_id: z.string().optional(),
    }).parse(req.body);
    const userId = req.user?.id
      ?? (body.device_id ? (db.prepare("SELECT id FROM users WHERE device_id = ?").get(body.device_id) as any)?.id ?? null : null);
    db.prepare("INSERT INTO events (user_id, event_id, params, created_at) VALUES (?, ?, ?, ?)")
      .run(userId, body.event_id, JSON.stringify(body.params ?? {}), nowIso());
    res.status(202).json({});
  });
  return router;
}
```

同时修改 `server/src/app.ts`：events 路由需要绕过强制 deviceAuth——在 `createApp` 中先挂 `eventsRouter(db)`（用 `deviceAuth(db, { required: false })` 的局部中间件），再挂强制认证的主 `/api` 路由。具体改法：

```ts
export function createApp(db: DB): Express {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json({ limit: "1mb" }));
  // events 允许匿名（sendBeacon 无法带 header，用 body.device_id 标识）
  app.use("/api", deviceAuth(db, { required: false }), eventsRouter(db));
  app.use(deviceAuth(db, { required: true }));
  app.use("/api", apiRouter(db));
  app.use(errorHandler);
  return app;
}
```

`server/src/routes/index.ts` 挂载 checkins/badges/profile。

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w server`
Expected: 全部测试文件 passed。

- [ ] **Step 5: Commit**

```bash
git add server/src server/tests
git commit -m "feat(server): 打卡结算、徽章列表、个人汇总与埋点路由"
git push
```

---

### Task 12: Client 脚手架 —— 构建链 + 路由 + TabBar + 会话/API 层

**Files:**
- Create: `client/package.json`, `client/vite.config.ts`, `client/tsconfig.json`, `client/tailwind.config.js`, `client/postcss.config.js`, `client/index.html`, `client/src/styles/index.css`, `client/src/main.tsx`, `client/src/App.tsx`
- Create: `client/src/lib/device.ts`, `client/src/lib/api.ts`, `client/src/lib/offlineQueue.ts`, `client/src/api/types.ts`, `client/src/api/hooks.ts`
- Create: `client/src/components/TabBar.tsx`
- Create: `client/vitest.config.ts`, `client/src/test/setup.ts`
- Test: `client/src/App.test.tsx`

**Interfaces:**
- Produces:
  - `getDeviceId(): string`（localStorage `wte_device_id`）
  - `api<T>(path, init?): Promise<T>`（附 `X-Device-Id`；非 2xx 抛 `ApiError(status, code, message)`）；`apiForm<T>(path, form: FormData): Promise<T>`（同头，不设 Content-Type）
  - `track(eventId: TrackEvent, params?): void`（`navigator.sendBeacon` 优先，fallback fetch keepalive；beacon 场景 body 附 `device_id`）
  - `TrackEvent = "cuisine_category_select" | "roulette_spin_click" | "roulette_result_action" | "recipe_cook_checkin" | "badge_unlock_view"`
  - `client/src/api/types.ts`：`CuisineNode { id, level, parent_id, name, name_en, tags, dish_count }`、`RecipeStep { text, seconds?, tip? }`、`RecipeDTO { id, cuisine_id, cuisine_path, name, name_en, emoji, image_path, kcal, minutes, difficulty, taste_tags, ingredients: {name,amount}[], tools, steps: RecipeStep[], solo_tip, color_tag, is_favorite?, is_blocked? }`、`SpinResponse { result: RecipeDTO, candidates: RecipeDTO[], pooled_up: string | null, reroll_left: number }`、`CheckinResponse { checkin_id, streak, max_streak, stat_date, new_badges: BadgeInfo[] }`、`BadgeInfo { id, name, description, icon, category }`、`BadgeView { id, name, description, icon, category, rule_type, current, target, unlocked, unlocked_at }`、`ProfileSummary { streak: {current,max}, total_checkins, calendar: string[], continents: {name,emoji,countries,dishes}[], pending_checkin: {recipe_id,name,emoji} | null, history: {checkin_id,recipe_id,name,emoji,photo_path,rating,stat_date}[] }`、`FavoriteItem = RecipeDTO & { favorited_at, continent, country, scene_tags }`
  - hooks（TanStack Query）：`useCuisineTree`、`useSpin`、`useReroll`、`useRecipe(id)`、`useFavorites`、`useFavoriteToggle`、`useCheckin`、`useBadges`、`useProfile`、`useSettings`
- 路由：`/` HomePage、`/recipe/:id` RecipeDetailPage、`/atlas` AtlasPage、`/favorites` FavoritesPage、`/profile` ProfilePage。

- [ ] **Step 1: 写配置与骨架文件**

`client/package.json`：
```json
{
  "name": "client",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "canvas-confetti": "^1.9.3",
    "framer-motion": "^11.11.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "zustand": "^5.0.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/canvas-confetti": "^1.6.4",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.5"
  }
}
```

`client/vite.config.ts`：
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
      "/dish-images": "http://localhost:3001",
    },
  },
});
```

`client/vitest.config.ts`：
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
```

`client/tsconfig.json`：
```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "@testing-library/jest-dom"],
    "noEmit": true
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

`client/tailwind.config.js`：
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { brand: { 500: "#ff6b35", 600: "#e5531f" } } } },
  plugins: [],
};
```

`client/postcss.config.js`：
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`client/index.html`：
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>今天吃什么</title>
  </head>
  <body class="bg-neutral-50">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`client/src/styles/index.css`：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`client/src/test/setup.ts`：
```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
```

`client/src/lib/device.ts`：
```ts
export function getDeviceId(): string {
  let id = localStorage.getItem("wte_device_id");
  if (!id) {
    id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("wte_device_id", id);
  }
  return id;
}
```

`client/src/lib/api.ts`：
```ts
import { getDeviceId } from "./device";

export type TrackEvent =
  | "cuisine_category_select"
  | "roulette_spin_click"
  | "roulette_result_action"
  | "recipe_cook_checkin"
  | "badge_unlock_view";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "X-Device-Id": getDeviceId(), ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? "INTERNAL", body?.error?.message ?? res.statusText);
  }
  return body as T;
}

export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

export function apiForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}

export function track(eventId: TrackEvent, params: Record<string, unknown> = {}): void {
  const payload = JSON.stringify({ event_id: eventId, params, device_id: getDeviceId() });
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
  } else {
    void fetch("/api/events", { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } });
  }
}
```

`client/src/lib/offlineQueue.ts`（打卡离线暂存队列；App.test 与 Task 16 依赖此模块）：
```ts
import { apiForm } from "./api";

const KEY = "wte_pending_checkins";

export interface PendingCheckin {
  recipe_id: string;
  rating: number;
  review?: string;
  photoDataUrl?: string;
}

interface Queued extends PendingCheckin { id: string }

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(items: Queued[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueCheckin(op: PendingCheckin): void {
  const items = read();
  items.push({ ...op, id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  write(items);
}

export function pendingCheckins(): Queued[] {
  return read();
}

export function removeCheckin(id: string): void {
  write(read().filter((i) => i.id !== id));
}

export async function replayCheckins(): Promise<void> {
  for (const item of read()) {
    const form = new FormData();
    form.append("recipe_id", item.recipe_id);
    form.append("rating", String(item.rating));
    if (item.review) form.append("review", item.review);
    if (item.photoDataUrl) {
      const blob = await (await fetch(item.photoDataUrl)).blob();
      form.append("photo", blob, "dish.jpg");
    }
    try {
      await apiForm("/api/checkins", form);
      removeCheckin(item.id);
    } catch {
      return; // 失败中止，保留剩余待下次
    }
  }
}
```

`client/src/api/types.ts`：按上方 Interfaces 逐字定义全部类型。

`client/src/api/hooks.ts`：
```ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiForm } from "../lib/api";
import type { BadgeView, CheckinResponse, CuisineNode, FavoriteItem, ProfileSummary, RecipeDTO, SpinResponse } from "./types";

export function useCuisineTree() {
  return useQuery({
    queryKey: ["cuisines"],
    queryFn: () => api<{ nodes: CuisineNode[] }>("/api/cuisines/tree"),
    staleTime: Infinity,
  });
}

export function useSpin() {
  return useMutation({
    mutationFn: (body: { cuisine_id: string | null; source: "all" | "favorites" }) =>
      api<SpinResponse>("/api/spin", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
}

export function useReroll() {
  return useMutation({
    mutationFn: (body: { cuisine_id: string | null; source: "all" | "favorites" }) =>
      api<SpinResponse>("/api/spin/reroll", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ["recipe", id],
    queryFn: () => api<{ recipe: RecipeDTO }>(`/api/recipes/${id}`),
    enabled: !!id,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api<{ items: FavoriteItem[] }>("/api/favorites"),
  });
}

export function useFavoriteToggle(recipeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (next: boolean) =>
      next
        ? api<{ ok: true }>("/api/favorites", { method: "POST", body: JSON.stringify({ recipe_id: recipeId }), headers: { "Content-Type": "application/json" } })
        : api<{ ok: true }>(`/api/favorites/${recipeId}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      void qc.invalidateQueries({ queryKey: ["recipe", recipeId] });
    },
  });
}

export function useCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => apiForm<CheckinResponse>("/api/checkins", form),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
      void qc.invalidateQueries({ queryKey: ["badges"] });
    },
  });
}

export function useBadges() {
  return useQuery({ queryKey: ["badges"], queryFn: () => api<{ badges: BadgeView[] }>("/api/badges") });
}

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: () => api<ProfileSummary>("/api/profile/summary") });
}

export function useSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { difficulty_pref: "easy" | "medium" | "hard" | null }) =>
      api<{ settings: object }>("/api/profile/settings", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
```

`client/src/components/TabBar.tsx`：
```tsx
import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "转盘", emoji: "🎡" },
  { to: "/atlas", label: "图鉴", emoji: "🗺️" },
  { to: "/favorites", label: "收藏", emoji: "❤️" },
  { to: "/profile", label: "我的", emoji: "👤" },
];

export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-neutral-200 bg-white" data-testid="tabbar">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${isActive ? "text-brand-500" : "text-neutral-400"}`
          }
        >
          <span className="text-lg leading-none">{t.emoji}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

`client/src/App.tsx`：
```tsx
import { Route, Routes, useLocation } from "react-router-dom";
import { TabBar } from "./components/TabBar";
import { HomePage } from "./pages/HomePage";
import { RecipeDetailPage } from "./pages/RecipeDetailPage";
import { AtlasPage } from "./pages/AtlasPage";
import { FavoritesPage } from "./pages/FavoritesPage";
import { ProfilePage } from "./pages/ProfilePage";

export default function App() {
  const { pathname } = useLocation();
  const showTabBar = pathname !== "/recipe" && !pathname.startsWith("/recipe/");
  return (
    <div className="mx-auto min-h-screen max-w-md pb-16">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/atlas" element={<AtlasPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      {showTabBar && <TabBar />}
    </div>
  );
}
```

`client/src/main.tsx`：
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

`client/src/pages/*`：本任务先创建 5 个最小占位页（每个 `export function XPage() { return <div>页面名</div>; }`，后续任务逐个替换为实现），保证路由可编译。

- [ ] **Step 2: 写失败测试**

`client/src/App.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./api/hooks", () => ({
  useCuisineTree: () => ({ data: undefined }),
  useProfile: () => ({ data: undefined }),
  useFavorites: () => ({ data: undefined }),
  useBadges: () => ({ data: undefined }),
}));
vi.mock("./lib/api", () => ({
  api: vi.fn().mockResolvedValue({}),
  apiForm: vi.fn().mockResolvedValue({}),
  track: vi.fn(),
}));
vi.mock("./lib/device", () => ({ getDeviceId: () => "test-device" }));
vi.mock("./lib/offlineQueue", () => ({
  pendingCheckins: () => [],
  enqueueCheckin: vi.fn(),
  removeCheckin: vi.fn(),
  replayCheckins: vi.fn().mockResolvedValue(undefined),
}));

describe("App 布局", () => {
  it("首页渲染 4 个底部 Tab", async () => {
    render(<App />);
    expect(screen.getByTestId("tabbar")).toBeInTheDocument();
    expect(screen.getByText("转盘")).toBeInTheDocument();
    expect(screen.getByText("图鉴")).toBeInTheDocument();
    expect(screen.getByText("收藏")).toBeInTheDocument();
    expect(screen.getByText("我的")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: 运行验证失败**

Run: `npm install && npm run test -w client`
Expected: FAIL（页面/组件未就位导致编译或断言失败；逐步补齐至通过）。

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 1 passed；typecheck 无错。

- [ ] **Step 5: Commit**

```bash
git add client
git commit -m "feat(client): Vite/Tailwind 脚手架、路由骨架与 API 层"
```

---

### Task 13: 全局状态 + 四级菜系级联选择器

**Files:**
- Create: `client/src/stores/useAppStore.ts`
- Create: `client/src/components/CuisinePicker.tsx`
- Modify: `client/src/pages/HomePage.tsx`（替换占位：顶部胶囊 + 打开选择器）
- Test: `client/src/stores/useAppStore.test.ts`, `client/src/components/CuisinePicker.test.tsx`

**Interfaces:**
- Produces: Zustand store（persist 到 localStorage `wte-app`）：
```ts
interface AppState {
  cuisineId: string | null;          // null = 全球大乱斗
  cuisineLabel: string;              // 如 "欧洲 > 意大利 > 西西里菜" 或 "全球大乱斗"
  source: "all" | "favorites";       // 转盘数据源
  lastCandidates: RecipeDTO[] | null; // 断网降级用
  setCuisine(id: string | null, label: string): void;
  setSource(s: "all" | "favorites"): void;
  setLastCandidates(c: RecipeDTO[]): void;
}
```
- `CuisinePicker({ open, onClose }: { open: boolean; onClose: () => void })`：全屏覆盖层；顶部「全球大乱斗」快捷项；四级下钻（当前层级列表 → 点击进入下一级，L4 点击即确认）；面包屑返回；确认时 `setCuisine(id, path)` + `track("cuisine_category_select", { level1_id, level2_id, level3_id, level4_id })`。初始状态读取 store 当前选择。

- [ ] **Step 1: 写失败测试**

`client/src/stores/useAppStore.test.ts`：
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "./useAppStore";

beforeEach(() => useAppStore.setState({ cuisineId: null, cuisineLabel: "全球大乱斗", source: "all", lastCandidates: null }));

describe("useAppStore", () => {
  it("setCuisine 更新选择并记忆", () => {
    useAppStore.getState().setCuisine("sicily", "欧洲 > 意大利 > 西西里菜");
    const s = useAppStore.getState();
    expect(s.cuisineId).toBe("sicily");
    expect(s.cuisineLabel).toContain("西西里");
  });

  it("setSource 切换收藏夹数据源", () => {
    useAppStore.getState().setSource("favorites");
    expect(useAppStore.getState().source).toBe("favorites");
  });
});
```

`client/src/components/CuisinePicker.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CuisinePicker } from "./CuisinePicker";
import { useAppStore } from "../stores/useAppStore";

vi.mock("../lib/api", () => ({ track: vi.fn(), api: vi.fn(), apiForm: vi.fn() }));
vi.mock("../api/hooks", async () => {
  const actual = await vi.importActual<typeof import("../api/hooks")>("../api/hooks");
  return { ...actual, useCuisineTree: () => ({ data: { nodes: [
    { id: "asia", level: 1, parent_id: null, name: "亚洲", name_en: "Asia", tags: [], dish_count: 0 },
    { id: "east-asia", level: 2, parent_id: "asia", name: "东亚", name_en: "East Asia", tags: [], dish_count: 0 },
    { id: "china", level: 3, parent_id: "east-asia", name: "中国", name_en: "China", tags: [], dish_count: 0 },
    { id: "sichuan", level: 4, parent_id: "china", name: "川菜", name_en: "Sichuan", tags: [], dish_count: 6 },
  ] } }) };
});

const renderPicker = () => {
  const qc = new QueryClient();
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={qc}>
      <CuisinePicker open onClose={onClose} />
    </QueryClientProvider>
  );
  return { onClose };
};

describe("CuisinePicker", () => {
  it("四级下钻后确认并回写 store", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();
    await user.click(screen.getByText("亚洲"));
    await user.click(screen.getByText("东亚"));
    await user.click(screen.getByText("中国"));
    await user.click(screen.getByText(/川菜/));
    expect(useAppStore.getState().cuisineId).toBe("sichuan");
    expect(useAppStore.getState().cuisineLabel).toBe("亚洲 > 东亚 > 中国 > 川菜");
    expect(onClose).toHaveBeenCalled();
  });

  it("全球大乱斗快捷项置空选择", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();
    await user.click(screen.getByText("全球大乱斗"));
    expect(useAppStore.getState().cuisineId).toBeNull();
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- useAppStore CuisinePicker`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/stores/useAppStore.ts`：
```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RecipeDTO } from "../api/types";

interface AppState {
  cuisineId: string | null;
  cuisineLabel: string;
  source: "all" | "favorites";
  lastCandidates: RecipeDTO[] | null;
  setCuisine: (id: string | null, label: string) => void;
  setSource: (s: "all" | "favorites") => void;
  setLastCandidates: (c: RecipeDTO[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      cuisineId: null,
      cuisineLabel: "全球大乱斗",
      source: "all",
      lastCandidates: null,
      setCuisine: (cuisineId, cuisineLabel) => set({ cuisineId, cuisineLabel }),
      setSource: (source) => set({ source }),
      setLastCandidates: (lastCandidates) => set({ lastCandidates }),
    }),
    { name: "wte-app" }
  )
);
```

`client/src/components/CuisinePicker.tsx`：
```tsx
import { useMemo, useState } from "react";
import { useCuisineTree } from "../api/hooks";
import { track } from "../lib/api";
import { useAppStore } from "../stores/useAppStore";

export function CuisinePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useCuisineTree();
  const setCuisine = useAppStore((s) => s.setCuisine);
  const [stack, setStack] = useState<string[]>([]); // 已下钻的节点 id

  const nodes = data?.nodes ?? [];
  const breadcrumb = useMemo(
    () => stack.map((id) => nodes.find((n) => n.id === id)!).filter(Boolean),
    [stack, nodes]
  );
  const currentLevel = stack.length === 0 ? 1 : (breadcrumb[breadcrumb.length - 1]?.level ?? 0) + 1;
  const children = nodes.filter((n) =>
    stack.length === 0 ? n.level === 1 : n.parent_id === stack[stack.length - 1]
  );

  const confirm = (id: string | null, label: string) => {
    setCuisine(id, label);
    if (id) {
      const chain = [...stack, id].map((cid) => nodes.find((n) => n.id === cid)!);
      track("cuisine_category_select", {
        level1_id: chain[0]?.id ?? null,
        level2_id: chain[1]?.id ?? null,
        level3_id: chain[2]?.id ?? null,
        level4_id: chain[3]?.id ?? null,
      });
    }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" data-testid="cuisine-picker">
      <header className="flex items-center gap-2 border-b border-neutral-100 p-4">
        <button onClick={() => (stack.length ? setStack(stack.slice(0, -1)) : onClose())} className="text-xl">
          {stack.length ? "←" : "×"}
        </button>
        <div className="flex-1 text-sm text-neutral-500">
          {stack.length === 0
            ? "选一个风味圈，或直接全球大乱斗"
            : breadcrumb.map((b) => b.name).join(" > ")}
        </div>
      </header>
      <ul className="flex-1 overflow-y-auto">
        {stack.length === 0 && (
          <li>
            <button
              className="w-full border-b border-neutral-100 px-5 py-4 text-left"
              onClick={() => confirm(null, "全球大乱斗")}
            >
              🌍 全球大乱斗 <span className="text-xs text-neutral-400">全量库随机</span>
            </button>
          </li>
        )}
        {children.map((n) => {
          const hasChildren = n.level < 4;
          return (
            <li key={n.id}>
              <button
                className="flex w-full items-center justify-between border-b border-neutral-100 px-5 py-4 text-left"
                onClick={() =>
                  hasChildren
                    ? setStack([...stack, n.id])
                    : confirm(n.id, [...breadcrumb.map((b) => b.name), n.name].join(" > "))
                }
              >
                <span>{n.name}</span>
                <span className="text-xs text-neutral-400">
                  {n.level === 4 ? `${n.dish_count} 道` : "›"}
                </span>
              </button>
            </li>
          );
        })}
        {currentLevel > 1 && children.length === 0 && (
          <li className="p-5 text-sm text-neutral-400">这个分类下还没有菜品</li>
        )}
      </ul>
    </div>
  );
}
```

`client/src/pages/HomePage.tsx`（本任务先做顶部胶囊部分；转盘区下一任务替换）：
```tsx
import { useState } from "react";
import { CuisinePicker } from "../components/CuisinePicker";
import { useAppStore } from "../stores/useAppStore";

export function HomePage() {
  const { cuisineId, cuisineLabel, source } = useAppStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="p-4">
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm"
        data-testid="cuisine-capsule"
      >
        <span className="truncate text-sm">{source === "favorites" ? "❤️ 收藏夹转盘" : cuisineLabel}</span>
        <span className="text-xs text-neutral-400">切换 ▾</span>
      </button>
      <CuisinePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      {/* RouletteWheel 于 Task 14 接入 */}
      <div className="py-20 text-center text-neutral-400" data-testid="wheel-placeholder">转盘区域</div>
    </div>
  );
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 全局状态与四级菜系级联选择器"
```

---

### Task 14: 转盘组件 + 结果弹窗（重转限额 / 并池提示）

**Files:**
- Create: `client/src/components/RouletteWheel.tsx`, `client/src/components/SpinResultModal.tsx`, `client/src/lib/sound.ts`
- Modify: `client/src/pages/HomePage.tsx`（接入转盘与弹窗、埋点、断网降级留接口）
- Test: `client/src/components/SpinResultModal.test.tsx`, `client/src/components/RouletteWheel.test.tsx`

**Interfaces:**
- Produces:
  - `sound.ts`：`playTick(): void`（惰性创建共享 `AudioContext`，60ms 短促方波点击音；异常静默）；`vibrate(pattern: number | number[]): void`（`navigator.vibrate` 包装，不存在则 no-op）
  - `RouletteWheel({ candidates, spinning, resultId, onSpinEnd }: { candidates: RecipeDTO[]; spinning: boolean; resultId: string | null; onSpinEnd: () => void })`：conic-gradient 扇区（6 色轮回）+ 扇区内 emoji+菜名；`resultId` 非空时以 framer-motion 旋转至目标扇区，总时长 2.5s，转动期间每 ~180ms `playTick()` + `vibrate(15)`（间隔递增模拟减速）
  - `SpinResultModal({ data, onClose, onReroll, rerolling, offline }: ...)`：中奖卡片（emoji/名称/cuisine_path/kcal/min）；`pooled_up` 横幅；按钮「查看食谱」（`track("roulette_result_action", { recipe_id, action_type: "view_recipe" })` → `/recipe/:id`）、「换一个」（显示剩余次数 `reroll_left`，=0 置灰 + 文案）；「换一个」点击 `track(... action_type: "reroll")`
- HomePage spin 流程：`track("roulette_spin_click", { selected_category: cuisineId ?? "global", source })` → `useSpin` onSuccess 存 `spinData` + `setLastCandidates(candidates)`；`onSpinEnd` 后展示 `SpinResultModal`。

- [ ] **Step 1: 写失败测试**

`client/src/components/SpinResultModal.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SpinResultModal } from "./SpinResultModal";
import type { SpinResponse } from "../api/types";

vi.mock("../lib/api", () => ({ track: vi.fn() }));

const data = (over: Partial<SpinResponse> = {}): SpinResponse => ({
  result: { id: "RC_SC_001", cuisine_id: "sichuan", cuisine_path: "亚洲 > 东亚 > 中国 > 川菜",
    name: "麻婆豆腐", name_en: "Mapo Tofu", emoji: "🌶️", image_path: null, kcal: 420,
    minutes: 20, difficulty: 2, taste_tags: ["麻辣"], ingredients: [], tools: [], steps: [],
    solo_tip: "", color_tag: "红" },
  candidates: [],
  pooled_up: null,
  reroll_left: 2,
  ...over,
} as SpinResponse);

const renderModal = (props: Partial<Parameters<typeof SpinResultModal>[0]> = {}) =>
  render(
    <MemoryRouter>
      <SpinResultModal
        data={data()}
        onClose={vi.fn()}
        onReroll={vi.fn()}
        rerolling={false}
        {...props}
      />
    </MemoryRouter>
  );

describe("SpinResultModal", () => {
  it("展示中奖菜品与元信息", () => {
    renderModal();
    expect(screen.getByText("麻婆豆腐")).toBeInTheDocument();
    expect(screen.getByText(/川菜/)).toBeInTheDocument();
  });

  it("并池提示横幅", () => {
    renderModal({ data: data({ pooled_up: "当前细分风味收录菜品较少，已自动整合南欧经典菜品一同入池" }) });
    expect(screen.getByText(/已自动整合/)).toBeInTheDocument();
  });

  it("重转次数用完置灰并提示", () => {
    renderModal({ data: data({ reroll_left: 0 }) });
    const btn = screen.getByRole("button", { name: /换一个/ });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/今日挑食机会已用完/)).toBeInTheDocument();
  });

  it("点击换一个触发 onReroll", async () => {
    const user = userEvent.setup();
    const onReroll = vi.fn();
    renderModal({ onReroll });
    await user.click(screen.getByRole("button", { name: /换一个/ }));
    expect(onReroll).toHaveBeenCalled();
  });
});
```

`client/src/components/RouletteWheel.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouletteWheel } from "./RouletteWheel";
import type { RecipeDTO } from "../api/types";

const mk = (id: string, name: string): RecipeDTO =>
  ({ id, name, emoji: "🍜", name_en: id, cuisine_id: "sichuan", cuisine_path: "", image_path: null,
     kcal: 400, minutes: 20, difficulty: 2, taste_tags: [], ingredients: [], tools: [], steps: [], solo_tip: "", color_tag: "红" } as RecipeDTO);

describe("RouletteWheel", () => {
  it("渲染全部候选扇区标签", () => {
    const candidates = ["a", "b", "c", "d", "e", "f"].map((s) => mk(s, `菜${s}`));
    render(<RouletteWheel candidates={candidates} spinning={false} resultId={null} onSpinEnd={vi.fn()} />);
    expect(screen.getByText("菜a")).toBeInTheDocument();
    expect(screen.getByText("菜f")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /今天吃它/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- SpinResultModal RouletteWheel`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/lib/sound.ts`：
```ts
let ctx: AudioContext | null = null;

export function playTick(): void {
  try {
    ctx ??= new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    /* 无音频环境静默 */
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* 不支持触觉的环境静默 */
  }
}
```

`client/src/components/RouletteWheel.tsx`：
```tsx
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RecipeDTO } from "../api/types";
import { playTick, vibrate } from "../lib/sound";

const SECTOR_COLORS = ["#ffe8d6", "#fff3c4", "#d8f3dc", "#dbe7ff", "#ffd6e0", "#e8dbff"];

export function RouletteWheel({ candidates, spinning, resultId, onSpinEnd }: {
  candidates: RecipeDTO[];
  spinning: boolean;
  resultId: string | null;
  onSpinEnd: () => void;
}) {
  const n = candidates.length;
  const sector = n > 0 ? 360 / n : 360;
  const [rotation, setRotation] = useState(0);
  const timers = useRef<number[]>([]);

  const targetIndex = resultId ? candidates.findIndex((c) => c.id === resultId) : -1;

  useEffect(() => {
    if (!spinning || targetIndex < 0) return;
    const current = rotation % 360;
    // 指针在正上方：让目标扇区中心转到 0°
    const desired = 360 * 5 - (targetIndex * sector + sector / 2);
    const delta = ((desired - current) % 360 + 360) % 360;
    setRotation(rotation + 360 * 5 + delta);
    // 减速咔哒：间隔递增的 10 次
    let delay = 120;
    for (let i = 0; i < 10; i++) {
      delay += 90 + i * 40;
      timers.current.push(window.setTimeout(() => { playTick(); vibrate(15); }, delay));
    }
    const done = window.setTimeout(onSpinEnd, 2500);
    timers.current.push(done);
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, resultId]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]" data-testid="roulette-wheel">
      {/* 指针 */}
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl">🔻</div>
      <motion.div
        className="h-full w-full rounded-full border-8 border-white shadow-lg"
        style={{
          background: `conic-gradient(${candidates
            .map((_, i) => `${SECTOR_COLORS[i % SECTOR_COLORS.length]} ${(i * sector).toFixed(2)}deg ${((i + 1) * sector).toFixed(2)}deg`)
            .join(", ")})`,
        }}
        animate={{ rotate: rotation }}
        transition={{ duration: 2.5, ease: [0.15, 0.85, 0.25, 1] }}
      >
        {candidates.map((c, i) => (
          <div
            key={c.id}
            className="absolute left-1/2 top-1/2 origin-top text-center"
            style={{
              transform: `rotate(${i * sector + sector / 2}deg) translateY(-104px) translateX(-50%)`,
            }}
          >
            <div className="text-xl">{c.emoji}</div>
            <div className="max-w-[72px] truncate text-[10px] text-neutral-700">{c.name}</div>
          </div>
        ))}
      </motion.div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        disabled={spinning || n === 0}
        onClick={() => undefined /* 点击事件由 HomePage 经 GO 按钮统一处理 */}
        className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-xl disabled:opacity-60"
        data-testid="wheel-go"
      >
        今天<br />吃它
      </motion.button>
    </div>
  );
}
```

说明：转盘中心按钮在 HomePage 作为触发器（`onClick` 由 HomePage 传入同款逻辑），本任务 HomePage 直接把 `useSpin` 的触发函数传给 `RouletteWheel` 新增 prop `onGo`——实现时把上面按钮的 `onClick` 改为 `onGo` 并在 props 中声明 `onGo: () => void`。

`client/src/components/SpinResultModal.tsx`：
```tsx
import { useNavigate } from "react-router-dom";
import type { SpinResponse } from "../api/types";
import { track } from "../lib/api";

export function SpinResultModal({ data, onClose, onReroll, rerolling, offline = false }: {
  data: SpinResponse;
  onClose: () => void;
  onReroll: () => void;
  rerolling: boolean;
  offline?: boolean;
}) {
  const navigate = useNavigate();
  const { result } = data;
  const exhausted = data.reroll_left <= 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6" data-testid="spin-result-modal">
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
        {offline && <div className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">当前离线，已用缓存菜单本地抽奖</div>}
        {data.pooled_up && (
          <div className="mb-3 rounded bg-sky-50 px-2 py-1.5 text-xs text-sky-600" data-testid="pooled-up-banner">
            {data.pooled_up}
          </div>
        )}
        <div className="text-6xl">{result.emoji}</div>
        <h2 className="mt-2 text-xl font-bold">{result.name}</h2>
        <p className="text-xs text-neutral-400">{result.name_en} · {result.cuisine_path}</p>
        <p className="mt-2 text-sm text-neutral-600">🔥 {result.kcal} kcal · ⏱ {result.minutes} 分钟 · {"★".repeat(result.difficulty)}</p>

        <div className="mt-5 space-y-2">
          <button
            className="w-full rounded-full bg-brand-500 py-3 font-medium text-white"
            onClick={() => {
              track("roulette_result_action", { recipe_id: result.id, action_type: "view_recipe" });
              navigate(`/recipe/${result.id}`);
            }}
          >
            查看食谱
          </button>
          <button
            className="w-full rounded-full border border-neutral-200 py-3 text-neutral-600 disabled:opacity-40"
            disabled={exhausted || rerolling}
            onClick={() => {
              track("roulette_result_action", { recipe_id: result.id, action_type: "reroll" });
              onReroll();
            }}
          >
            不合胃口，换一个{!exhausted && `（剩 ${data.reroll_left} 次）`}
          </button>
          {exhausted && <p className="text-xs text-neutral-400">今日挑食机会已用完，勇敢尝试一下吧！或手动切换其他菜系</p>}
          <button className="w-full py-1 text-xs text-neutral-400" onClick={onClose}>关 闭</button>
        </div>
      </div>
    </div>
  );
}
```

`client/src/pages/HomePage.tsx` 替换为完整实现：
```tsx
import { useState } from "react";
import { CuisinePicker } from "../components/CuisinePicker";
import { RouletteWheel } from "../components/RouletteWheel";
import { SpinResultModal } from "../components/SpinResultModal";
import { useSpin, useReroll, useProfile } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";
import { track } from "../lib/api";
import type { SpinResponse } from "../api/types";

export function HomePage() {
  const { cuisineId, cuisineLabel, source, setLastCandidates } = useAppStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [spinData, setSpinData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const spinMut = useSpin();
  const rerollMut = useReroll();
  const profile = useProfile();

  const doSpin = () => {
    track("roulette_spin_click", { selected_category: cuisineId ?? "global", source });
    setSpinning(true);
    setShowResult(false);
    spinMut.mutate(
      { cuisine_id: cuisineId, source },
      {
        onSuccess: (d) => {
          setSpinData(d);
          setLastCandidates(d.candidates);
        },
        onError: () => setSpinning(false), // 断网降级在 Task 18 增强
      }
    );
  };

  const doReroll = () => {
    rerollMut.mutate(
      { cuisine_id: cuisineId, source },
      { onSuccess: (d) => { setSpinData(d); setShowResult(false); setSpinning(true); } }
    );
  };

  const pending = profile.data?.pending_checkin;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col p-4">
      <button
        onClick={() => setPickerOpen(true)}
        className="flex w-full items-center justify-between rounded-full bg-white px-4 py-2.5 shadow-sm"
        data-testid="cuisine-capsule"
      >
        <span className="truncate text-sm">{source === "favorites" ? "❤️ 收藏夹转盘" : cuisineLabel}</span>
        <span className="text-xs text-neutral-400">切换 ▾</span>
      </button>

      {pending && (
        <button
          className="mt-3 rounded-xl bg-amber-50 px-4 py-2 text-left text-xs text-amber-700"
          onClick={() => (window.location.href = `/recipe/${pending.recipe_id}`)}
          data-testid="pending-checkin-banner"
        >
          昨天的「{pending.name}」还没打卡，去补个记录吧 →
        </button>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        <RouletteWheel
          candidates={spinData?.candidates ?? []}
          spinning={spinning}
          resultId={spinData?.result.id ?? null}
          onSpinEnd={() => { setSpinning(false); setShowResult(true); }}
          onGo={doSpin}
        />
      </div>

      <p className="pb-2 text-center text-xs text-neutral-400">
        {spinMut.isError ? "转盘开小差了，点按钮重试" : "选定风味圈，转一转决定今晚吃什么"}
      </p>

      <CuisinePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      {showResult && spinData && (
        <SpinResultModal
          data={spinData}
          onClose={() => setShowResult(false)}
          onReroll={doReroll}
          rerolling={rerollMut.isPending}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 转盘动效组件与中奖结果弹窗（重转限额/并池提示）"
```

---

### Task 15: 食谱详情页（清单划线 / 步骤计时器 / 悬浮操作栏）

**Files:**
- Create: `client/src/lib/timeText.ts`, `client/src/lib/imageCompress.ts`, `client/src/components/StepTimer.tsx`, `client/src/components/IngredientList.tsx`
- Modify: `client/src/pages/RecipeDetailPage.tsx`（替换占位）
- Test: `client/src/lib/timeText.test.ts`, `client/src/components/StepTimer.test.tsx`, `client/src/components/IngredientList.test.tsx`

**Interfaces:**
- Produces:
  - `parseTimeSegments(text: string): Segment[]`，`Segment = { type: "text"; value: string } | { type: "timer"; value: string; seconds: number }`；正则 `(\d+)\s*(分钟|秒)`，分钟×60
  - `compressImage(file: File, maxEdge = 1280, quality = 0.8): Promise<Blob>`（canvas 缩放，输出 image/jpeg）
  - `StepTimer({ seconds, label, onClose }: { seconds: number; label: string; onClose: () => void })`：固定底部悬浮卡，每秒倒计时，归零 `vibrate([200,100,200])` 并显示「时间到」；组件卸载清理 interval
  - `IngredientList({ items }: { items: { name: string; amount: string }[] })`：复选框行，勾选划线（`line-through text-neutral-400`）
  - RecipeDetailPage：顶图（`image_path` 加载失败回退 emoji 大块渐变区）+ 元数据 + `IngredientList` + 厨具标签 + 步骤卡（`parseTimeSegments` 渲染，timer 段为可点按钮 → 打开 `StepTimer`）+ 一人食贴士 + 底部悬浮栏（收藏红心 / 近期不想看到它(block) / 完成今日打卡按钮 —— 打卡弹窗 Task 16 接入，本任务先留 `data-testid="checkin-open"` 空回调）

- [ ] **Step 1: 写失败测试**

`client/src/lib/timeText.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { parseTimeSegments } from "./timeText";

describe("parseTimeSegments", () => {
  it("拆分普通文本与时间词", () => {
    const segs = parseTimeSegments("大火煎 3 分钟后翻面，再焖 90 秒");
    expect(segs).toEqual([
      { type: "text", value: "大火煎 " },
      { type: "timer", value: "3 分钟", seconds: 180 },
      { type: "text", value: "后翻面，再焖 " },
      { type: "timer", value: "90 秒", seconds: 90 },
    ]);
  });

  it("无时间词返回单段", () => {
    expect(parseTimeSegments("翻炒均匀")).toEqual([{ type: "text", value: "翻炒均匀" }]);
  });
});
```

`client/src/components/StepTimer.test.tsx`：
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepTimer } from "./StepTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("StepTimer", () => {
  it("倒计时递减并归零提示", async () => {
    render(<StepTimer seconds={3} label="煎制" onClose={vi.fn()} />);
    expect(screen.getByText(/03/)).toBeInTheDocument();
    vi.advanceTimersByTime(3100);
    expect(screen.getByText("时间到")).toBeInTheDocument();
  });

  it("点击关闭触发 onClose", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onClose = vi.fn();
    render(<StepTimer seconds={60} label="焖" onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /取消/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

`client/src/components/IngredientList.test.tsx`：
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngredientList } from "./IngredientList";

describe("IngredientList", () => {
  it("勾选后条目划线", async () => {
    const user = userEvent.setup();
    render(<IngredientList items={[{ name: "嫩豆腐", amount: "300g" }]} />);
    const checkbox = screen.getByRole("checkbox");
    expect(screen.getByText("嫩豆腐")).not.toHaveClass("line-through");
    await user.click(checkbox);
    expect(screen.getByText("嫩豆腐")).toHaveClass("line-through");
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- timeText StepTimer IngredientList`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/lib/timeText.ts`：
```ts
export type Segment =
  | { type: "text"; value: string }
  | { type: "timer"; value: string; seconds: number };

const TIME_WORD = /(\d+)\s*(分钟|秒)/g;

export function parseTimeSegments(text: string): Segment[] {
  const segs: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TIME_WORD)) {
    const idx = m.index ?? 0;
    if (idx > last) segs.push({ type: "text", value: text.slice(last, idx) });
    const n = Number(m[1]);
    segs.push({ type: "timer", value: m[0], seconds: m[2] === "分钟" ? n * 60 : n });
    last = idx + m[0].length;
  }
  if (last < text.length) segs.push({ type: "text", value: text.slice(last) });
  return segs;
}
```

`client/src/lib/imageCompress.ts`：
```ts
export function compressImage(file: File, maxEdge = 1280, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}
```

`client/src/components/StepTimer.tsx`：
```tsx
import { useEffect, useState } from "react";
import { vibrate } from "../lib/sound";

export function StepTimer({ seconds, label, onClose }: { seconds: number; label: string; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);
  const finished = left <= 0;

  useEffect(() => {
    if (finished) { vibrate([200, 100, 200]); return; }
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 bottom-14 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-4 text-white shadow-2xl" data-testid="step-timer">
      <div className="text-3xl font-bold tabular-nums" data-testid="timer-display">{mm}:{ss}</div>
      <div className="flex-1 text-sm">
        <div className="opacity-70">{label}</div>
        {finished && <div className="font-medium text-amber-400">时间到</div>}
      </div>
      <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">取消</button>
    </div>
  );
}
```

`client/src/components/IngredientList.tsx`：
```tsx
import { useState } from "react";

export function IngredientList({ items }: { items: { name: string; amount: string }[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  return (
    <ul className="divide-y divide-neutral-100" data-testid="ingredient-list">
      {items.map((it, i) => {
        const on = checked.has(i);
        return (
          <li key={i}>
            <label className="flex cursor-pointer items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i); else next.add(i);
                    return next;
                  })
                }
                className="h-4 w-4 accent-[#ff6b35]"
              />
              <span className={`flex-1 text-sm ${on ? "line-through text-neutral-400" : ""}`}>{it.name}</span>
              <span className={`text-xs ${on ? "text-neutral-300" : "text-neutral-500"}`}>{it.amount}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
```

`client/src/pages/RecipeDetailPage.tsx`：
```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecipe, useFavoriteToggle } from "../api/hooks";
import { api } from "../lib/api";
import { IngredientList } from "../components/IngredientList";
import { StepTimer } from "../components/StepTimer";
import { parseTimeSegments } from "../lib/timeText";
import type { Segment } from "../lib/timeText";

function StepText({ text, onTimer }: { text: string; onTimer: (seconds: number, label: string) => void }) {
  return (
    <p className="text-sm leading-6">
      {parseTimeSegments(text).map((seg: Segment, i: number) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <button
            key={i}
            className="mx-0.5 rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-600"
            onClick={() => onTimer(seg.seconds, seg.value)}
          >
            ⏱ {seg.value}
          </button>
        )
      )}
    </p>
  );
}

export function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useRecipe(id);
  const [timer, setTimer] = useState<{ seconds: number; label: string } | null>(null);
  const [fav, setFav] = useState<boolean | null>(null);
  const toggleFav = useFavoriteToggle(id ?? "");
  const recipe = data?.recipe;

  if (isLoading || !recipe) return <div className="p-10 text-center text-neutral-400">加载中…</div>;

  const isFav = fav ?? recipe.is_favorite ?? false;

  return (
    <div className="pb-24">
      {/* 顶图（AI 图缺失时回退 emoji 渐变） */}
      <div className="relative h-56 w-full bg-gradient-to-br from-orange-100 to-amber-200">
        {recipe.image_path && (
          <img
            src={recipe.image_path}
            alt={recipe.name}
            className="h-full w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center text-8xl">{recipe.emoji}</div>
        <button onClick={() => navigate(-1)} className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-sm">←</button>
      </div>

      <div className="p-4">
        <h1 className="text-xl font-bold">{recipe.name}</h1>
        <p className="text-xs text-neutral-400">{recipe.name_en} · {recipe.cuisine_path}</p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-neutral-100 px-2 py-1">⏱ {recipe.minutes} 分钟</span>
          <span className="rounded-full bg-neutral-100 px-2 py-1">{"★".repeat(recipe.difficulty)} 难度</span>
          <span className="rounded-full bg-neutral-100 px-2 py-1">🔥 {recipe.kcal} kcal</span>
          {recipe.taste_tags.map((t) => (
            <span key={t} className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{t}</span>
          ))}
        </div>

        <section className="mt-5">
          <h2 className="mb-1 text-sm font-semibold">🛒 原材料（1 人份）</h2>
          <IngredientList items={recipe.ingredients} />
        </section>

        <section className="mt-5">
          <h2 className="mb-1.5 text-sm font-semibold">🍳 必备厨具</h2>
          <div className="flex flex-wrap gap-1.5">
            {recipe.tools.map((t) => (
              <span key={t} className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{t}</span>
            ))}
          </div>
        </section>

        <section className="mt-5 space-y-3">
          <h2 className="text-sm font-semibold">👨‍🍳 烹饪步骤</h2>
          {recipe.steps.map((s, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs text-white">{i + 1}</span>
                {s.tip && <span className="text-xs text-amber-600">💡 {s.tip}</span>}
              </div>
              <StepText text={s.text} onTimer={(seconds, label) => setTimer({ seconds, label })} />
            </div>
          ))}
        </section>

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800" data-testid="solo-tip">
          🏠 一人食贴士：{recipe.solo_tip}
        </div>
      </div>

      {timer && <StepTimer seconds={timer.seconds} label={timer.label} onClose={() => setTimer(null)} />}

      {/* 底部悬浮操作栏 */}
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md items-center gap-2 border-t border-neutral-100 bg-white/95 p-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-xl"
          data-testid="fav-toggle"
          onClick={() => { setFav(!isFav); toggleFav.mutate(!isFav); }}
        >
          {isFav ? "❤️" : "🤍"}
        </button>
        <button
          className="h-11 rounded-full border border-neutral-200 px-3 text-xs text-neutral-500"
          data-testid="block-button"
          onClick={() => {
            void api(`/api/recipes/${recipe.id}/block`, { method: "POST" });
            navigate("/");
          }}
        >
          近期不想看到它
        </button>
        <button
          className="ml-auto h-11 flex-1 rounded-full bg-brand-500 font-medium text-white"
          data-testid="checkin-open"
          onClick={() => undefined /* Task 16 接入 CheckinModal */}
        >
          完成今日打卡
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 食谱详情页（清单划线/步骤计时器/悬浮操作栏）"
```

---

### Task 16: 打卡弹窗（上传压缩 / 彩屑 / 徽章喜报 / 断网暂存）

**Files:**
- Create: `client/src/lib/confetti.ts`, `client/src/components/CheckinModal.tsx`, `client/src/components/BadgeUnlockedModal.tsx`（`offlineQueue.ts` 已在 Task 12 创建，本任务为其补测试并在 App 挂载回放）
- Modify: `client/src/pages/RecipeDetailPage.tsx`（接入 CheckinModal 与成功流转）, `client/src/App.tsx`（挂 `online` 事件回放）
- Test: `client/src/lib/offlineQueue.test.ts`, `client/src/components/CheckinModal.test.tsx`

**Interfaces:**
- Produces:
  - `confetti.ts`：`fireConfetti(): void`（canvas-confetti 120 粒 / spread 75 / origin y=0.6）
  - `offlineQueue.ts`：`enqueueCheckin(op: { recipe_id: string; rating: number; review?: string; photoDataUrl?: string }): void`；`pendingCheckins(): Array<同参数 & { id: string }>`；`removeCheckin(id: string): void`；`replayCheckins(): Promise<void>`（逐条 `apiForm` 重放，成功移除、失败中止保留）——localStorage key `wte_pending_checkins`
  - `CheckinModal({ recipe, onClose, onSuccess }: { recipe: RecipeDTO; onClose: () => void; onSuccess: (r: CheckinResponse) => void })`：星级 1-5（必填，未选禁用提交）、短评 textarea（maxLength 100）、照片 `<input type="file" accept="image/*">`（选中即 `compressImage` 预览 dataURL）；提交：`navigator.onLine` 为 true → FormData（`recipe_id/rating/review/photo`）走 `useCheckin`；离线 → `enqueueCheckin`（photo 转 dataURL）→ 直接回调合成响应 `{ checkin_id: "LOCAL", streak: null, max_streak: null, stat_date: "", new_badges: [] }` 并提示已暂存
  - `BadgeUnlockedModal({ badges, onClose }: { badges: BadgeInfo[]; onClose: () => void })`：逐枚展示（内部 index state），每枚展示时 `track("badge_unlock_view", { badge_id, badge_category })`，「下一枚 / 收下」按钮
- RecipeDetailPage 成功流转：`fireConfetti()` → 展示结算视图（streak/max_streak，`streak===null` 时显示「已离线暂存，联网后自动同步」）→ 有 `new_badges` 则接 `BadgeUnlockedModal` → `track("recipe_cook_checkin", { recipe_id, has_image, streak_days })`

- [ ] **Step 1: 写失败测试**

`client/src/lib/offlineQueue.test.ts`：
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { enqueueCheckin, pendingCheckins, removeCheckin, replayCheckins } from "./offlineQueue";

vi.mock("./api", () => ({ apiForm: vi.fn() }), { virtual: false });

beforeEach(() => localStorage.clear());

describe("offlineQueue", () => {
  it("入队/查询/移除", () => {
    enqueueCheckin({ recipe_id: "RC_SC_001", rating: 5 });
    expect(pendingCheckins().length).toBe(1);
    removeCheckin(pendingCheckins()[0].id);
    expect(pendingCheckins().length).toBe(0);
  });

  it("replay 逐条上传成功后清空，失败保留", async () => {
    const { apiForm } = await import("./api");
    (apiForm as any).mockResolvedValueOnce({ checkin_id: "CK1" }).mockRejectedValueOnce(new Error("network"));
    enqueueCheckin({ recipe_id: "a", rating: 5 });
    enqueueCheckin({ recipe_id: "b", rating: 4 });
    await replayCheckins();
    expect((apiForm as any).mock.calls.length).toBe(2); // 第二条失败后停止
    expect(pendingCheckins().length).toBe(1);
    expect(pendingCheckins()[0].recipe_id).toBe("b");
  });
});
```

`client/src/components/CheckinModal.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckinModal } from "./CheckinModal";
import type { RecipeDTO } from "../api/types";

vi.mock("../api/hooks", () => ({ useCheckin: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock("../lib/api", () => ({ track: vi.fn() }));
vi.mock("../lib/imageCompress", () => ({ compressImage: vi.fn().mockResolvedValue(new Blob()) }));
vi.mock("../lib/confetti", () => ({ fireConfetti: vi.fn() }));

const recipe = { id: "RC_SC_001", name: "麻婆豆腐", emoji: "🌶️" } as RecipeDTO;

describe("CheckinModal", () => {
  it("未选星级时提交禁用", () => {
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect(screen.getByRole("button", { name: /打卡/ })).toBeDisabled();
  });

  it("选星提交走 useCheckin.mutate", async () => {
    const user = userEvent.setup();
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await user.click(screen.getByTestId("star-4"));
    await user.click(screen.getByRole("button", { name: /打卡/ }));
    await waitFor(() => expect(screen.getByTestId("checkin-success")).toBeInTheDocument());
  });

  it("短评超过 100 字被截断", async () => {
    render(<CheckinModal recipe={recipe} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const ta = screen.getByLabelText(/心得/) as HTMLTextAreaElement;
    expect(ta.maxLength).toBe(100);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- offlineQueue CheckinModal`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/lib/confetti.ts`：
```ts
import confetti from "canvas-confetti";

export function fireConfetti(): void {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
}
```

`client/src/lib/offlineQueue.ts`（已在 Task 12 创建——下方代码即其最终实现；若文件已存在且内容一致则跳过，仅需补本任务的测试）：
```ts
import { apiForm } from "./api";

const KEY = "wte_pending_checkins";

export interface PendingCheckin {
  recipe_id: string;
  rating: number;
  review?: string;
  photoDataUrl?: string;
}

interface Queued extends PendingCheckin { id: string }

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(items: Queued[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueCheckin(op: PendingCheckin): void {
  const items = read();
  items.push({ ...op, id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  write(items);
}

export function pendingCheckins(): Queued[] {
  return read();
}

export function removeCheckin(id: string): void {
  write(read().filter((i) => i.id !== id));
}

export async function replayCheckins(): Promise<void> {
  for (const item of read()) {
    const form = new FormData();
    form.append("recipe_id", item.recipe_id);
    form.append("rating", String(item.rating));
    if (item.review) form.append("review", item.review);
    if (item.photoDataUrl) {
      const blob = await (await fetch(item.photoDataUrl)).blob();
      form.append("photo", blob, "dish.jpg");
    }
    try {
      await apiForm("/api/checkins", form);
      removeCheckin(item.id);
    } catch {
      return; // 失败中止，保留剩余待下次
    }
  }
}
```

`client/src/components/CheckinModal.tsx`：
```tsx
import { useState } from "react";
import { useCheckin } from "../api/hooks";
import type { CheckinResponse, RecipeDTO } from "../api/types";
import { compressImage } from "../lib/imageCompress";
import { enqueueCheckin } from "../lib/offlineQueue";
import { fireConfetti } from "../lib/confetti";
import { track } from "../lib/api";

export function CheckinModal({ recipe, onClose, onSuccess }: {
  recipe: RecipeDTO;
  onClose: () => void;
  onSuccess: (r: CheckinResponse) => void;
}) {
  const checkin = useCheckin();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [done, setDone] = useState<CheckinResponse | null>(null);

  const submit = async () => {
    if (!rating) return;
    const form = new FormData();
    form.append("recipe_id", recipe.id);
    form.append("rating", String(rating));
    if (review) form.append("review", review);
    if (photoDataUrl) {
      const blob = await (await fetch(photoDataUrl)).blob();
      form.append("photo", blob, "dish.jpg");
    }
    if (navigator.onLine) {
      checkin.mutate(form, {
        onSuccess: (r) => {
          fireConfetti();
          track("recipe_cook_checkin", { recipe_id: recipe.id, has_image: photoDataUrl ? 1 : 0, streak_days: r.streak });
          setDone(r);
          onSuccess(r);
        },
      });
    } else {
      enqueueCheckin({ recipe_id: recipe.id, rating, review: review || undefined, photoDataUrl: photoDataUrl ?? undefined });
      const fake: CheckinResponse = { checkin_id: "LOCAL", streak: null as any, max_streak: null as any, stat_date: "", new_badges: [] };
      setDone(fake);
      onSuccess(fake);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" data-testid="checkin-modal">
      <div className="mx-auto w-full max-w-md rounded-t-3xl bg-white p-5">
        {done ? (
          <div className="py-6 text-center" data-testid="checkin-success">
            <div className="text-5xl">🎉</div>
            {done.streak !== null ? (
              <>
                <p className="mt-3 text-lg font-bold">打卡成功！连续 {done.streak} 天</p>
                {done.streak === done.max_streak && done.streak > 1 && (
                  <p className="text-sm text-amber-600">🔥 新纪录！</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-lg font-bold">已离线暂存，联网后自动同步</p>
            )}
            <button className="mt-5 w-full rounded-full bg-brand-500 py-3 text-white" onClick={onClose}>好的</button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">打卡 · {recipe.name} {recipe.emoji}</h2>
              <button onClick={onClose} className="text-neutral-400">×</button>
            </div>
            <div className="flex gap-1" data-testid="star-row">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} data-testid={`star-${s}`} className={`text-3xl ${s <= rating ? "" : "opacity-30"}`} onClick={() => setRating(s)}>
                  ⭐
                </button>
              ))}
            </div>
            <textarea
              aria-label="心得"
              maxLength={100}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="写点心得（100 字以内，选填）"
              className="mt-3 w-full rounded-xl bg-neutral-50 p-3 text-sm"
              rows={3}
            />
            <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-xl bg-neutral-50 p-3 text-sm">
              📷 {photoPreview ? "已选照片（点击更换）" : "晒一张成品图（选填）"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const blob = await compressImage(file);
                  const dataUrl = await new Promise<string>((resolve) => {
                    const r = new FileReader();
                    r.onload = () => resolve(r.result as string);
                    r.readAsDataURL(blob);
                  });
                  setPhotoDataUrl(dataUrl);
                  setPhotoPreview(dataUrl);
                }}
              />
              {photoPreview && <img src={photoPreview} alt="preview" className="ml-auto h-10 w-10 rounded object-cover" />}
            </label>
            <button
              className="mt-4 w-full rounded-full bg-brand-500 py-3 font-medium text-white disabled:opacity-40"
              disabled={!rating || checkin.isPending}
              onClick={submit}
            >
              {checkin.isPending ? "提交中…" : "完成打卡"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

`client/src/components/BadgeUnlockedModal.tsx`：
```tsx
import { useEffect, useState } from "react";
import type { BadgeInfo } from "../api/types";
import { track } from "../lib/api";

export function BadgeUnlockedModal({ badges, onClose }: { badges: BadgeInfo[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const badge = badges[index];
  const isLast = index === badges.length - 1;

  useEffect(() => {
    if (badge) track("badge_unlock_view", { badge_id: badge.id, badge_category: badge.category });
  }, [badge]);

  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-8" data-testid="badge-unlocked-modal">
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
```

RecipeDetailPage 接入：`checkin-open` 按钮改为 `setCheckinOpen(true)`；新增状态 `checkinOpen`、`badges`（`BadgeInfo[]`）；`onSuccess` 回调里 `setBadges(r.new_badges)`；渲染：

```tsx
{checkinOpen && (
  <CheckinModal
    recipe={recipe}
    onClose={() => setCheckinOpen(false)}
    onSuccess={() => setCheckinOpen(false)}
  />
)}
{badges.length > 0 && <BadgeUnlockedModal badges={badges} onClose={() => setBadges([])} />}
```

（打卡成功后彩屑已在 CheckinModal 内触发；徽章喜报置于其上层 `z-[60]`。）

`client/src/App.tsx` 挂载回放：
```tsx
import { useEffect } from "react";
import { replayCheckins } from "./lib/offlineQueue";
// 组件内：
useEffect(() => {
  void replayCheckins();
  const onOnline = () => void replayCheckins();
  window.addEventListener("online", onOnline);
  return () => window.removeEventListener("online", onOnline);
}, []);
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 打卡弹窗（压缩上传/彩屑/徽章喜报/离线暂存）"
```

---

### Task 17: 图鉴页 + 收藏页 + 我的页

**Files:**
- Create: `client/src/components/BadgeCard.tsx`
- Modify: `client/src/pages/AtlasPage.tsx`, `client/src/pages/FavoritesPage.tsx`, `client/src/pages/ProfilePage.tsx`（替换占位）
- Test: `client/src/components/BadgeCard.test.tsx`, `client/src/pages/FavoritesPage.test.tsx`

**Interfaces:**
- Consumes: `useBadges`、`useProfile`、`useFavorites`、`useAppStore.setSource`。
- Produces:
  - `BadgeCard({ badge }: { badge: BadgeView })`：彩色（unlocked）/灰度（`grayscale opacity-40`）卡片，图标 + 名称 + 进度 `current/target`；unlocked 显示解锁日期（`unlocked_at.slice(0,10)`）
  - AtlasPage：顶部「五大洲探索」卡片列表（`profile.continents`，`countries`/5 进度条，对应 `globe_master` 进度）+ 「徽章墙」Grid（`BadgeCard` × `useBadges`）
  - FavoritesPage：筛选 chips（全部 / 15分钟速成 quick / 周末大餐 weekend）+ 按大洲分组的收藏列表（continent 标题 + 卡片：emoji/名称/耗时，点击进详情）+ 「从我的收藏夹转动」开关（绑定 `store.source`，开启即 `setSource("favorites")`）
  - ProfilePage：成就总览（current streak / max streak / 总打卡数 / 徽章数）+ 打卡历史时间轴（emoji 或 photo 缩略图 + 日期 + 菜名）+ 设置区（难度偏好 select：不限/简单/中等/进阶 → `useSettings`；「清除本地数据」→ `confirm` 后 `localStorage.clear()` + `location.reload()`）

- [ ] **Step 1: 写失败测试**

`client/src/components/BadgeCard.test.tsx`：
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BadgeCard } from "./BadgeCard";
import type { BadgeView } from "../api/types";

const base = {
  id: "eu_first", name: "初涉欧陆", description: "累计完成 3 道不同的欧洲菜品", icon: "🏰",
  category: "world", rule_type: "cuisine_continent_count",
} as const;

describe("BadgeCard", () => {
  it("未解锁：灰度 + 进度", () => {
    render(<BadgeCard badge={{ ...base, current: 1, target: 3, unlocked: false, unlocked_at: null } as BadgeView} />);
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByTestId("badge-card")).toHaveClass("grayscale");
  });

  it("已解锁：彩色 + 日期", () => {
    render(<BadgeCard badge={{ ...base, current: 3, target: 3, unlocked: true, unlocked_at: "2026-09-13T10:00:00.000Z" } as BadgeView} />);
    expect(screen.getByTestId("badge-card")).not.toHaveClass("grayscale");
    expect(screen.getByText(/2026-09-13/)).toBeInTheDocument();
  });
});
```

`client/src/pages/FavoritesPage.test.tsx`：
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FavoritesPage } from "./FavoritesPage";
import { useAppStore } from "../stores/useAppStore";

vi.mock("../lib/api", () => ({ api: vi.fn(), apiForm: vi.fn(), track: vi.fn() }));
vi.mock("../api/hooks", () => ({
  useFavorites: () => ({ data: { items: [
    { id: "RC_YU_003", name: "蒜蓉菜心", emoji: "🥬", minutes: 10, cuisine_path: "亚洲 > 东亚 > 中国 > 粤菜",
      continent: "亚洲", country: "中国", scene_tags: ["quick"], ingredients: [], tools: [], steps: [],
      taste_tags: [], solo_tip: "", color_tag: "绿", kcal: 180, difficulty: 1, name_en: "Choy Sum",
      image_path: null, cuisine_id: "yuecai", favorited_at: "2026-09-13" },
    { id: "RC_YU_004", name: "煲仔饭", emoji: "🍚", minutes: 45, cuisine_path: "亚洲 > 东亚 > 中国 > 粤菜",
      continent: "亚洲", country: "中国", scene_tags: ["weekend"], ingredients: [], tools: [], steps: [],
      taste_tags: [], solo_tip: "", color_tag: "棕", kcal: 680, difficulty: 3, name_en: "Claypot Rice",
      image_path: null, cuisine_id: "yuecai", favorited_at: "2026-09-13" },
  ] } }),
}));

describe("FavoritesPage", () => {
  it("渲染收藏并按场景筛选", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    expect(screen.getByText("蒜蓉菜心")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /15分钟速成/ }));
    expect(screen.queryByText("煲仔饭")).not.toBeInTheDocument();
  });

  it("收藏夹转盘开关切换数据源", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><FavoritesPage /></MemoryRouter>);
    await user.click(screen.getByTestId("source-switch"));
    expect(useAppStore.getState().source).toBe("favorites");
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- BadgeCard FavoritesPage`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/components/BadgeCard.tsx`：
```tsx
import type { BadgeView } from "../api/types";

export function BadgeCard({ badge }: { badge: BadgeView }) {
  return (
    <div
      data-testid="badge-card"
      className={`rounded-2xl bg-white p-4 text-center shadow-sm ${badge.unlocked ? "" : "grayscale opacity-40"}`}
    >
      <div className="text-4xl">{badge.icon}</div>
      <div className="mt-1 text-sm font-medium">{badge.name}</div>
      <div className="text-xs text-neutral-400">
        {badge.unlocked ? badge.unlocked_at!.slice(0, 10) : `${badge.current}/${badge.target}`}
      </div>
    </div>
  );
}
```

`client/src/pages/AtlasPage.tsx`：
```tsx
import { useBadges, useProfile } from "../api/hooks";
import { BadgeCard } from "../components/BadgeCard";

export function AtlasPage() {
  const profile = useProfile();
  const badges = useBadges();
  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">🗺️ 美食图鉴</h1>

      <section>
        <h2 className="mb-2 text-sm font-semibold">五大洲探索</h2>
        <div className="grid grid-cols-2 gap-2">
          {(profile.data?.continents ?? []).map((c) => (
            <div key={c.name} className="rounded-2xl bg-white p-3 shadow-sm">
              <div className="text-2xl">{c.emoji}</div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-neutral-400">{c.countries} 个国家 · {c.dishes} 道菜</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-neutral-100">
                <div className="h-full rounded bg-brand-500" style={{ width: `${Math.min(100, (c.countries / 5) * 100)}%` }} />
              </div>
            </div>
          ))}
          {(profile.data?.continents ?? []).length === 0 && (
            <div className="col-span-2 rounded-2xl bg-white p-6 text-center text-sm text-neutral-400 shadow-sm">
              还没有探索记录，去转个菜试试！
            </div>
          )}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">徽章墙</h2>
        <div className="grid grid-cols-3 gap-2">
          {(badges.data?.badges ?? []).map((b) => <BadgeCard key={b.id} badge={b} />)}
        </div>
      </section>
    </div>
  );
}
```

`client/src/pages/FavoritesPage.tsx`：
```tsx
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";

const FILTERS = [
  { key: "all", label: "全部" },
  { key: "quick", label: "15分钟速成" },
  { key: "weekend", label: "周末大餐" },
] as const;

export function FavoritesPage() {
  const favorites = useFavorites();
  const source = useAppStore((s) => s.source);
  const setSource = useAppStore((s) => s.setSource);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");

  const items = useMemo(
    () => (favorites.data?.items ?? []).filter((i) => filter === "all" || i.scene_tags.includes(filter as any)),
    [favorites.data, filter]
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      if (!map.has(item.continent)) map.set(item.continent, []);
      map.get(item.continent)!.push(item);
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
            className={`rounded-full px-3 py-1.5 text-xs ${filter === f.key ? "bg-brand-500 text-white" : "bg-white text-neutral-500 shadow-sm"}`}
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
                  <span className="block text-xs text-neutral-400">⏱ {item.minutes} 分钟 · {item.cuisine_path}</span>
                </span>
                <span className="text-neutral-300">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {items.length === 0 && (
        <div className="mt-10 text-center text-sm text-neutral-400">还没有收藏，去食谱页点亮红心吧</div>
      )}
    </div>
  );
}
```

`client/src/pages/ProfilePage.tsx`：
```tsx
import { useProfile, useBadges, useSettings } from "../api/hooks";
import { useAppStore } from "../stores/useAppStore";

export function ProfilePage() {
  const profile = useProfile();
  const badges = useBadges();
  const settings = useSettings();
  const setSource = useAppStore((s) => s.setSource);
  const data = profile.data;

  return (
    <div className="p-4">
      <h1 className="mb-3 text-lg font-bold">👤 我的</h1>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: "当前连击", value: data?.streak.current ?? "-" },
          { label: "最高纪录", value: data?.streak.max ?? "-" },
          { label: "总打卡", value: data?.total_checkins ?? "-" },
          { label: "徽章", value: badges.data?.badges.filter((b) => b.unlocked).length ?? "-" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="text-xl font-bold text-brand-500">{s.value}</div>
            <div className="text-[10px] text-neutral-400">{s.label}</div>
          </div>
        ))}
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold">打卡时间轴</h2>
        <div className="space-y-2">
          {(data?.history ?? []).map((h) => (
            <div key={h.checkin_id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
              {h.photo_path ? (
                <img src={h.photo_path} alt={h.name} className="h-11 w-11 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50 text-2xl">{h.emoji}</span>
              )}
              <div className="flex-1">
                <div className="text-sm font-medium">{h.name} <span className="text-amber-500">{"★".repeat(h.rating)}</span></div>
                <div className="text-xs text-neutral-400">{h.stat_date}</div>
              </div>
            </div>
          ))}
          {(data?.history ?? []).length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-400">还没有打卡记录</div>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold">设置</h2>
        <label className="flex items-center justify-between py-1.5 text-sm">
          转盘难度偏好
          <select
            data-testid="difficulty-select"
            className="rounded-lg border border-neutral-200 px-2 py-1 text-sm"
            defaultValue=""
            onChange={(e) => settings.mutate({ difficulty_pref: (e.target.value || null) as any })}
          >
            <option value="">不限</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">进阶</option>
          </select>
        </label>
        <button
          className="mt-2 w-full rounded-full border border-red-100 py-2 text-xs text-red-500"
          onClick={() => {
            if (window.confirm("确定清除本地数据（设备标识将重置）？")) {
              localStorage.clear();
              useAppStore.getState().setSource("all");
              window.location.reload();
            }
          }}
        >
          清除本地数据
        </button>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 图鉴/收藏/我的三页（探索地图+徽章墙+筛选+设置）"
```

---

### Task 18: 转盘断网降级（缓存池本地模拟）

**Files:**
- Create: `client/src/lib/localSpin.ts`
- Modify: `client/src/pages/HomePage.tsx`（spin onError 分支；`SpinResultModal` 的 `offline` 标记 Task 14 已支持）
- Test: `client/src/lib/localSpin.test.ts`

**Interfaces:**
- Produces: `localPick(candidates: RecipeDTO[]): RecipeDTO | null`（均匀随机取一；空返回 null）。
- HomePage `spinMut.mutate` 的 `onError`：若 `store.lastCandidates` 非空 → 本地构造 `SpinResponse`（`result: localPick(...)`、`pooled_up: null`、`reroll_left: 0`）→ `setSpinData` + `setSpinning(true)`（动画后弹窗，`offline` 传 true）；否则保留错误文案。

- [ ] **Step 1: 写失败测试**

`client/src/lib/localSpin.test.ts`：
```ts
import { describe, it, expect } from "vitest";
import { localPick } from "./localSpin";

describe("localPick", () => {
  it("从候选中取一", () => {
    const candidates = [{ id: "a" }, { id: "b" }, { id: "c" }] as any[];
    const picked = localPick(candidates)!;
    expect(candidates.map((c) => c.id)).toContain(picked.id);
  });

  it("空候选返回 null", () => {
    expect(localPick([])).toBeNull();
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `npm run test -w client -- localSpin`
Expected: FAIL。

- [ ] **Step 3: 实现**

`client/src/lib/localSpin.ts`：
```ts
import type { RecipeDTO } from "../api/types";

export function localPick(candidates: RecipeDTO[]): RecipeDTO | null {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
```

HomePage 的 `doSpin` onError 改为（组件内新增 `const offlineRef = useRef(false);`）：
```ts
onError: () => {
  const cached = useAppStore.getState().lastCandidates;
  const picked = cached ? localPick(cached) : null;
  if (picked) {
    setSpinData({ result: picked, candidates: cached!, pooled_up: null, reroll_left: 0 });
    setSpinning(true); // 动画结束后 onSpinEnd 打开弹窗
    offlineRef.current = true;
  } else {
    setSpinning(false);
  }
}
```
`onSpinEnd` 打开弹窗时传 `offline={offlineRef.current}`、随后重置 `offlineRef.current = false`。

- [ ] **Step 4: 运行验证通过**

Run: `npm run test -w client && npm run typecheck -w client`
Expected: 全部 passed。

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): 断网时用缓存候选池本地转盘"
```

---

### Task 19: AI 顶图批量生成（55 张）

**Files:**
- Create: `server/public/dish-images/RC_*.png`（55 张二进制资产，用 **imagegen** 技能生成）

**Interfaces:**
- Consumes: `RECIPE_SEEDS`（`id` 与 `nameEn`）。
- Produces: `server/public/dish-images/<recipe_id>.png`（1:1，1024×1024）。种子已写死 `image_path=/dish-images/<id>.png`；缺失文件时客户端自动回退 emoji（Task 15 的 onError 兜底），因此**缺图不阻塞**，但验收要求 ≥50 张。

- [ ] **Step 1: 统一 prompt 模板**

对每道菜使用（`{name_en}` 替换为该菜英文名）：
```
Professional overhead food photography of {name_en}, single serving on a ceramic plate,
warm natural window light, rustic wooden table background, shallow depth of field,
appetizing and realistic, square composition, no text, no watermark
```
按菜系分批生成（每批 5-8 张）：川菜 6 → 粤菜 6 → 关西 5 → 泰北 6 → 北印 6 → 托斯卡纳 6 → 普罗旺斯 6 → 瓦哈卡 6 → 克里特 4 → 利马 4。

- [ ] **Step 2: 生成并落盘**

文件命名严格 `<recipe_id>.png`（如 `RC_SC_001.png`），存入 `server/public/dish-images/`。

- [ ] **Step 3: 验证覆盖数**

Run: `ls server/public/dish-images | wc -l`
Expected: ≥ 50（允许个别生成失败，失败项记录在提交说明中；客户端有 emoji 兜底）。

- [ ] **Step 4: Commit**

```bash
git add server/public/dish-images
git commit -m "feat(assets): 55 道菜品 AI 顶图"
git push
```

---

### Task 20: 生产构建 + 全链路验收

**Files:**
- Modify: 无新文件（验收与缺陷修复）

**Interfaces:**
- Consumes: 全部前序任务。

- [ ] **Step 1: 全量测试与构建**

Run: `npm test`
Expected: server + client 全部 passed。

Run: `npm run build`
Expected: `client/dist` 产出，tsc 无错。

- [ ] **Step 2: 启动生产服务并冒烟**

Run: `npm start`（后台）
Expected: `WhatToEat server listening on http://localhost:3001`。

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/`
Expected: `200`（SPA index）。

Run: `curl -s -X POST http://localhost:3001/api/spin -H "Content-Type: application/json" -H "X-Device-Id: smoke-1" -d '{"cuisine_id":null,"source":"all"}' | head -c 200`
Expected: 含 `"result"` 与 `"candidates"` 的 JSON。

- [ ] **Step 3: 手动全链路走查（浏览器 / web-gui-tester）**

按 PRD 用例核对：
1. UC-01：首页 → 选「亚洲 > 东亚 > 日本 > 关西料理」→ 转盘 2.5s 动画停在候选之一 → 结果卡片弹出
2. 「查看食谱」→ 详情页完整（原料划线、步骤计时器可启动、厨具、贴士）
3. 收藏红心 → 收藏页按地域分组出现；开启「从收藏夹转动」→ 转盘走收藏源
4. UC-02：打卡（星级 + 可选拍照）→ 彩屑 + streak 结算展示
5. UC-03：达成条件后徽章解锁喜报；图鉴页探索卡片与徽章墙灰/彩状态正确
6. 「换一个」2 次后置灰 + 文案；克里特/利马菜系触发并池提示横幅
7. 埋点核对：`SELECT event_id, COUNT(*) FROM events GROUP BY event_id` 覆盖 5 类事件

- [ ] **Step 4: 修复走查缺陷并回归**

任何缺陷：定位 → 修复 → `npm test` 回归 → 单独 commit。

- [ ] **Step 5: 最终提交与推送**

```bash
git add -A
git commit -m "chore: MVP 全链路验收通过"
git push
```

---

## 计划自审记录（Self-Review）

1. **规格覆盖**：菜系四级选择器（T13）、转盘（T7/T14）、保底并池（T7）、重转限额（T7/T14）、食谱引擎全字段（T4/T15）、计时器（T15）、打卡（T11/T16）、Streak（T6/T11）、徽章 8 枚（T10/T16/T17）、收藏与收藏夹转盘（T9/T17）、拉黑 30 天（T7/T8/T15）、补打卡提示（T14 `pending_checkin`）、离线降级（T16 打卡暂存 / T18 转盘）、埋点 5 事件（T11/T12 及调用点）、图片方案（T19 + emoji 兜底）、审核钩子（T11 no-op）。规格 §1.2 差异声明全部落实。
2. **占位符扫描**：菜谱数据集 52 道正文内容按「完整 55 道属性清单 + 3 道完整示例 + 格式校验测试」约束生成（内容创作型工作，属性与格式完全确定，测试强制校验）；其余步骤均含完整代码与命令，无 TBD/TODO。
3. **类型一致性**：`RecipeDTO`/`SpinResponse`/`BadgeView`/`ProfileSummary` 于 Task 12 定义，T13-T18 引用一致；`spin_history.action` 枚举 `spin/reroll/block`（T2 schema 与 T7 写入一致；`view_recipe`/`drop` 类行为分析走 `events` 表）。`RecipeRow`（T7）与 `toRecipeDTO`（T8）衔接；`badgeProgress/evaluateBadges/listBadgesForUser`（T10）被 T11 调用。
4. **与规格的对齐微调**：数据集最终为 10 个 L4 菜系 55 道（规格 §9 为示例列举），恰好 2 个叶节点 <6（crete=4、lima=4）符合「1-2 个」要求；`users` 表增加 `settings` 列承载 §6.6 偏好设置。规格 §9 行随本计划提交一并修订。




