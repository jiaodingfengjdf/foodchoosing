# WhatToEat「今天吃什么」MVP 设计文档

- 日期：2026-09-13
- 状态：已获用户批准的设计定稿
- 需求来源：根目录 `WhatToEat.md`（PRD V1.0.0）

## 1. 背景与目标

PRD 定义了一款面向独居人群的「美食随机决策 + 一人食食谱 + 打卡成就」工具。本设计将 PRD 落地为可运行的 MVP，核心验证链路：**选菜系 → 转盘决策 → 食谱详情 → 打卡 → 徽章/收藏激励**。

对标 PRD 的关键指标：转盘→食谱浏览转化 ≥75%、食谱→打卡转化 ≥25%（通过埋点表留取数据基础）。

### 1.1 与用户确认的关键决策

| 决策点 | 结论 |
| --- | --- |
| 产品形态 | 移动端优先 H5 Web App（非小程序/App 原生） |
| 数据层 | 轻量后端 Node.js + SQLite（非纯前端、非云服务） |
| 功能范围 | 完整核心闭环（PRD 5 大模块全部实现） |
| 图片方案 | 转盘/卡片用 Emoji + 品牌渐变；食谱顶图 AI 逐张生成 |
| 技术栈 | React SPA + Express 单体（npm workspaces，单仓库） |
| 用户体系 | 免登录，设备 ID 匿名用户 |

### 1.2 与 PRD 的差异声明（MVP 简化项）

- **内容安全审核**（PRD 6.1）：本地部署无第三方鉴黄/敏感词服务，MVP 跳过，服务端预留 `moderation` 接入点（打卡提交前的同步钩子函数）。
- **离线能力**（PRD 5）：无 Service Worker 离线包；降级方案为「转盘请求失败时用上次缓存候选池本地模拟 + 打卡本地暂存待重试」。
- **四级菜系覆盖广度**：数据集约 55 道菜、10-12 个四级菜系（PRD 的全球四级树结构完整实现，但叶节点菜品量有限；含个别 <6 道的小众菜系用于验证保底并池机制）。
- **埋点**（PRD 6.2）：5 个事件入库 SQLite `events` 表，不做报表后台。
- **触觉/音效**：H5 环境下 `navigator.vibrate`（Android WebView/部分浏览器生效）+ Web Audio 合成咔哒声（无音频素材依赖）；iOS H5 不支持震动，静默降级。

## 2. 总体架构

```
菜谱转盘/
├── client/                      # React 18 + Vite + TypeScript + Tailwind CSS
│   └── src/
│       ├── pages/               # Home / RecipeDetail / Collection / Profile
│       ├── components/          # RouletteWheel / CuisinePicker / CheckinModal / BadgeWall / ...
│       ├── api/                 # fetch 封装 + TanStack Query hooks
│       ├── stores/              # Zustand：当前菜系、转盘状态、收藏夹数据源开关
│       └── lib/                 # 时间词解析、图片压缩、本地暂存队列
├── server/                      # Express + better-sqlite3 (TypeScript)
│   └── src/
│       ├── index.ts             # 入口：API + 静态托管 client/dist + /uploads + /dish-images
│       ├── db.ts                # better-sqlite3 初始化（WAL）+ 幂等迁移 + 种子
│       ├── routes/              # cuisines / spin / recipes / checkins / favorites / badges / events
│       ├── services/           # roulette.ts / badges.ts / streak.ts
│       └── seed/                # cuisines.ts / recipes.ts / badge-defs.ts
├── server/public/dish-images/   # AI 生成的菜品顶图（构建期静态资产）
├── server/uploads/              # 打卡照片（multer 磁盘存储）
├── data/what-to-eat.db          # SQLite 单文件
└── package.json                 # npm workspaces + concurrently 开发脚本
```

- 开发：`npm run dev`（concurrently 同时起 Vite dev server 与 Express，Vite proxy `/api`、`/uploads` → `:3001`）。
- 生产：`npm run build && npm start`，Express 单进程托管 API + 前端静态资源。
- 会话：客户端首次访问生成 `device_id`（UUID，localStorage 持久化），所有请求携带 `X-Device-Id` 头；服务端 upsert `users` 表。

## 3. 数据模型（SQLite）

| 表 | 字段 | 说明 |
| --- | --- | --- |
| `cuisines` | `id TEXT PK, level INT, parent_id TEXT, name, name_en, tags JSON` | 四级级联树；L1 洲/风味区、L2 次区域、L3 国家、L4 细分菜系；`tags` 为风味圈标记（如 `mediterranean`、`latam`），供徽章判定与收藏聚合 |
| `recipes` | `id TEXT PK, cuisine_id FK→L4, name, name_en, emoji, image_path, kcal INT, minutes INT, difficulty INT(1-5), taste_tags JSON, ingredients JSON[{name, amount, note?}], tools JSON, steps JSON[{text, seconds?, tip?}], solo_tip TEXT, color_tag TEXT` | `color_tag` 为主色调枚举（红/橙/黄/绿/白/棕/黑），供「色彩大师」徽章；`image_path` 为 AI 生成顶图 |
| `users` | `id TEXT PK, device_id TEXT UNIQUE, created_at` | 匿名设备用户 |
| `checkins` | `id TEXT PK, user_id FK, recipe_id FK, photo_path NULL, rating INT(1-5), review VARCHAR(100), stat_date TEXT(YYYY-MM-DD), created_at` | `stat_date` 为 04:00 界线归属日 |
| `favorites` | `user_id+recipe_id 复合主键, created_at` | 收藏去重 |
| `spin_history` | `id, user_id, recipe_id, source(all/favorites), action(spin/reroll/view/drop/block), created_at` | 支持 7 天去重过滤与转化分析；`view` 由前端查看食谱时上报 |
| `reroll_usage` | `user_id+date 复合主键, count INT` | 每日「换一个」限额（2 次） |
| `badge_defs` | `id TEXT PK, name, description, icon, category(world/lifestyle), rule_type, rule_params JSON, sort INT` | 徽章规则定义（见 §6） |
| `user_badges` | `user_id+badge_id 复合主键, unlocked_at, progress_snapshot JSON` | 解锁记录 |
| `blocks` | `user_id+recipe_id 复合主键, blocked_until TEXT` | 临时拉黑 30 天 |
| `events` | `id, user_id, event_id TEXT, params JSON, created_at` | PRD 6.2 五事件：`cuisine_category_select` / `roulette_spin_click` / `roulette_result_action` / `recipe_cook_checkin` / `badge_unlock_view` |

种子数据（幂等：INSERT OR IGNORE）：菜系树、约 55 道菜谱、8 枚徽章定义。

## 4. REST API

统一错误格式 `{ "error": { "code": "...", "message": "..." } }`；鉴权即 `X-Device-Id` 头。

| 方法与路径 | 功能 | 关键返回 |
| --- | --- | --- |
| `GET /api/cuisines/tree` | 四级级联树 | 树形 JSON（含每 L4 节点 `dish_count`） |
| `POST /api/spin` | 转盘。body: `{cuisine_id|null, source}`（null=全球大乱斗） | `{result: RecipeCard, candidates: RecipeCard[6-8], pooled_up?: {merged_from, message}, reroll_left}` |
| `POST /api/spin/reroll` | 换一个。校验当日剩余次数 | 同上；超限返回 429 `{code:"REROLL_EXHAUSTED"}` |
| `POST /api/recipes/:id/block` | 临时拉黑 30 天 | `{ok}` |
| `GET /api/recipes/:id` | 食谱详情（含 `is_favorite`） | 完整字段 |
| `GET/POST/DELETE /api/favorites` | 收藏列表（含地域/耗时聚合标签）/收藏/取消 | — |
| `POST /api/checkins` | multipart：`photo?`, `rating`, `review?` | `{streak, stat_date, new_badges: Badge[]}` |
| `GET /api/badges` | 全部徽章 + 当前进度/解锁状态 | — |
| `GET /api/profile/summary` | Streak/最高纪录/近 30 天打卡日历/各大洲探索计数/打卡历史 | — |
| `PATCH /api/profile/settings` | 偏好（默认难度筛选等） | — |
| `POST /api/events` | 埋点上报（fire-and-forget） | 202 |

## 5. 核心算法（服务端实现，重点单测对象）

### 5.1 转盘加权随机 `roulette.ts`

```
buildPool(cuisine_id|null, source):
  1. 基础池 = source=favorites ? 用户收藏 : cuisine_id 对应 L4 菜品（null → 全库）
  2. 过滤：7 天内已打卡的 recipe_id、blocks 未过期 recipe_id
  3. 若池 < 6：逐级并入父级（L4→L3→L2）菜品（同样过滤），并置 pooled_up 标记
  4. 难度分桶：easy(≤20min)/medium(20-45)/hard(≥45)，目标配比 50%/35%/15%
     桶为空时配比向相邻桶回退；各桶内均匀随机抽至 6-8 道
  5. 扇区候选 = 抽样结果；中奖项在候选内均匀随机（难度配比已由分桶抽样保证）
spin:
  6. 写 spin_history(action=spin)
  7. 返回 result + candidates + reroll_left
```

### 5.2 Streak 归属日 `streak.ts`

- 归属日 = `(当地时间 - 4h) 的日期`，即凌晨 00:00-03:59 计入前一自然日；「当地」取服务器本地时区（MVP 单机部署即用户时区）。
- 打卡成功时：若昨日（归属日口径）已有打卡 → `current_streak + 1`；否则重置为 1；同步更新 `max_streak`。当日（归属日）重复打卡不重复计连击（当日首打卡生效）。
- MVP 不设用户表冗余字段，streak 由 `checkins.stat_date` 序列实时计算并缓存于响应。
- 「换一个」每日 2 次限额同样按归属日口径计数（`reroll_usage.date` 即 stat_date）。

### 5.3 徽章判定引擎 `badges.ts`

打卡事务内同步判定，`rule_type` 与种子徽章：

| id | 名称 | rule_type | 参数 |
| --- | --- | --- | --- |
| `eu_first` | 初涉欧陆 | `cuisine_continent_count` | continent=欧洲, distinct=3 |
| `latam` | 拉美风暴 | `cuisine_continent_count` | 南美+墨西哥, distinct=5 |
| `mediterranean` | 地中海之友 | `cuisine_tag_count` | tags 含 `mediterranean`（希腊/南意/西班牙/普罗旺斯）, distinct=7 |
| `globe_master` | 环球饕客 | `continent_coverage` | 五大洲各 ≥5 国家 |
| `solo_chef` | 一人食料理长 | `streak_days` | 7 |
| `fast_cook` | 快手打工人 | `fast_dish_count` | minutes≤15, count=10 |
| `night_owl` | 深夜碳水怪 | `late_night_count` | 21:00 后打卡, count=3 |
| `color_master` | 色彩大师 | `color_variety` | 5 |

判定基于 `checkins` 聚合查询；进度以 `{current, target}` 返回，前端徽章墙展示 `3/5` 与灰/彩状态。

## 6. 前端页面与交互

底部 Tab 导航 4 页：**首页（转盘）/ 图鉴 / 收藏 / 我的**。

### 6.1 首页
- 顶部菜系胶囊：显示当前路径（如 `欧洲 > 意大利 > 西西里菜` 或 `全球大乱斗`），点击打开全屏四级级联选择器（逐级下钻 + 面包屑返回）；记忆上次选择（localStorage），首次进入默认「全球大乱斗」。
- 转盘：6-8 扇区（emoji + 菜名），framer-motion 旋转，总时长 2.5s（加速→减速→精准停在中奖扇区，目标角度由 `result` 在候选数组中的索引计算）；扇区经过指针时 Web Audio 合成咔哒声 + `navigator.vibrate(15)`。
- 结果弹窗：中奖卡片（emoji 大图 + 名称 + kcal/耗时）；按钮「查看食谱」「换一个」（显示剩余次数，用完置灰 + 文案「今日挑食机会已用完，勇敢尝试一下吧！或手动切换其他菜系」）。
- 若 `pooled_up`：结果弹窗顶部展示 PRD 文案「当前细分风味收录菜品较少，已自动整合[父级区域]经典菜品一同入池」。
- 断网：spin 请求失败 → 使用上次候选池本地模拟（结果与打卡入 localStorage 暂存队列，恢复后重放）。

### 6.2 食谱详情
- 顶图（AI 生成）+ 中英文标题 + 发源地标签（至 L4）+ kcal；标签栏：耗时 / 难度星级(1-5) / 口味标签。
- 原料清单：一人份用量，行内复选框点击划线。
- 必备厨具标签。
- 步骤卡片：序号 + 要领加粗；文本内时间词（正则 `\d+\s*(分钟|秒|min)`）高亮为按钮，点击弹悬浮倒计时（结束震动提醒，页面后台亦可运行）。
- 一人食贴士 Banner。
- 底部悬浮栏：收藏红心 / 「近期不想看到它」（拉黑 30 天）/ 「完成今日打卡」。
- 收藏夹内菜品详情页保留「重新转一次」替代入口。

### 6.3 打卡弹层
- 照片（可选，canvas 压缩 ≤1280px JPEG q0.8）+ 1-5 星自评 + 100 字短评（选填）。
- 提交成功：canvas-confetti 全屏彩屑 → Streak 结算视图（当日/连击天数/是否破纪录）→ 若有 `new_badges` 依次弹出徽章解锁喜报（触发 `badge_unlock_view` 埋点）。
- 首页中奖卡片次日可补打卡（归属日口径：昨日中奖未打卡的卡片在首页提示补打卡）。

### 6.4 图鉴页
- 五大洲探索进度（风格化卡片式「地图」：各大洲 emoji 徽记 + 打卡国家数/菜品数进度条；不实现真实地理 GIS 地图）。
- 徽章墙：灰度未解锁 / 彩色已解锁；点击查看进度、解锁时间、达成路径。

### 6.5 收藏页
- 两个筛选维度：按地域（大洲/国家聚类）；按耗时/场景（15分钟速成 / 周末大餐）。
- 「从我的收藏夹转动」开关 → 首页转盘 `source=favorites`。

### 6.6 我的
- Streak 总览（当前/最高）、打卡总数、徽章数。
- 打卡历史时间轴画廊（缩略图 + 日期 + 菜名）。
- 设置：默认难度筛选（转盘偏好）、清除本地数据。

## 7. 错误处理与安全

- API 错误码：`REROLL_EXHAUSTED`(429) / `NOT_FOUND`(404) / `VALIDATION_ERROR`(400) / `INTERNAL`(500)；前端 TanStack Query 错误态 + 全局 toast。
- 上传：multer 磁盘存储，白名单 jpg/png/webp，≤5MB，随机文件名。
- 服务端：helmet、zod 输入校验、SQLite WAL 模式、打卡事务（checkins + 徽章 + streak 原子性）。
- 内容审核：预留 `moderateCheckin(photo, review)` 空实现钩子，后续可接第三方。

## 8. 测试策略（TDD：红-绿-重构）

**Server（Vitest + supertest，内存 SQLite）**
- `roulette.test.ts`：难度配比统计性断言、7 天打卡去重、拉黑过滤、池 <6 并池与 `pooled_up`、收藏夹数据源、空池兜底。
- `streak.test.ts`：04:00 界线跨日、连击累计、中断重置、当日重复打卡。
- `badges.test.ts`：8 枚徽章逐个触发/不触发/进度值。
- `reroll.test.ts`：2 次/日限额、跨日重置、超限 429。
- `favorites/block/checkins` 路由集成测试。

**Client（Vitest + Testing Library）**
- 级联选择器下钻/面包屑/记忆选择；换一个剩余次数状态机；时间词解析与倒计时启动；收藏筛选聚合。

**验收**：`npm test` 全绿 + 手动全链路走查（转盘→食谱→打卡→徽章弹窗→收藏转盘）。

## 9. 内容生产（菜谱数据集 + AI 顶图）

- 55 道菜，覆盖 10 个 L4 菜系（最终构成：中国-川菜 6、中国-粤菜 6、日本-关西 5、泰国-泰北 6、印度-北印 6、意大利-托斯卡纳 6、法国-普罗旺斯 6、墨西哥-瓦哈卡 6、希腊-克里特 4、秘鲁-利马 4），其中克里特与利马 <6 道用于验证保底并池；普罗旺斯/克里特打 `mediterranean` 标签，瓦哈卡+利马打 `latam` 标签。
- 每道菜：中英文名、emoji、kcal、耗时、难度、口味标签、一人份原料（6-10 行）、厨具、4-6 步骤（含计时秒数）、一人食贴士、主色调。
- 顶图：imagegen 统一 prompt 风格（俯拍、暖光、单一餐盘、真实感食摄），每道菜 1 张 1:1，存 `server/public/dish-images/`。

## 10. 里程碑

1. 仓库脚手架（workspaces、Vite、Express、SQLite 迁移/种子）+ CI 可跑测试
2. 服务端核心：菜系树/转盘/streak/徽章/收藏/埋点 API（TDD）
3. 前端框架：路由、Tab、设备会话、API 层
4. 首页转盘全交互（动效/音效/弹窗/限额）
5. 食谱详情 + 计时器 + 收藏
6. 打卡闭环（上传/彩屑/徽章喜报/补打卡）
7. 图鉴 + 我的 + 收藏页
8. 菜谱数据集编写 + AI 顶图批量生成
9. 断网降级 + 联调验收（全链路走查、性能抽查）
