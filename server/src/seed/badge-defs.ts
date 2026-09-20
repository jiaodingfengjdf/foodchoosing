export interface BadgeDefSeed {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "world" | "lifestyle";
  ruleType: string;
  ruleParams: object;
  sort: number;
}

export const BADGES: BadgeDefSeed[] = [
  {
    id: "eu_first",
    name: "初涉欧陆",
    description: "累计完成 3 道不同的欧洲菜品",
    icon: "🏰",
    category: "world",
    ruleType: "cuisine_continent_count",
    ruleParams: { continents: ["欧洲"], distinct: 3 },
    sort: 1,
  },
  {
    id: "latam",
    name: "拉美风暴",
    description: "累计完成 5 道南美洲或墨西哥菜品",
    icon: "💃",
    category: "world",
    ruleType: "cuisine_continent_count",
    ruleParams: { continents: ["南美洲"], countries: ["墨西哥"], distinct: 5 },
    sort: 2,
  },
  {
    id: "mediterranean",
    name: "地中海之友",
    description: "打卡完成 7 道地中海风味菜品",
    icon: "⛵",
    category: "world",
    ruleType: "cuisine_tag_count",
    ruleParams: { tag: "mediterranean", distinct: 7 },
    sort: 3,
  },
  {
    id: "globe_master",
    name: "环球饕客",
    description: "打卡亚洲、欧洲、北美洲和南美洲各一道菜",
    icon: "🌍",
    category: "world",
    ruleType: "continent_coverage",
    ruleParams: { per_continent: 1, continents: ["亚洲", "欧洲", "北美洲", "南美洲"] },
    sort: 4,
  },
  {
    id: "solo_chef",
    name: "一人食料理长",
    description: "连续打卡 7 天",
    icon: "👨‍🍳",
    category: "lifestyle",
    ruleType: "streak_days",
    ruleParams: { days: 7 },
    sort: 5,
  },
  {
    id: "fast_cook",
    name: "快手打工人",
    description: "累计打卡 10 道制作耗时 ≤15 分钟的菜品",
    icon: "⚡",
    category: "lifestyle",
    ruleType: "fast_dish_count",
    ruleParams: { minutes_max: 15, count: 10 },
    sort: 6,
  },
  {
    id: "night_owl",
    name: "深夜碳水怪",
    description: "在 21:00 后完成打卡 3 次",
    icon: "🌙",
    category: "lifestyle",
    ruleType: "late_night_count",
    ruleParams: { hour: 21, count: 3 },
    sort: 7,
  },
  {
    id: "color_master",
    name: "色彩大师",
    description: "累计打卡包含 5 种不同主色调的菜品",
    icon: "🎨",
    category: "lifestyle",
    ruleType: "color_variety",
    ruleParams: { distinct: 5 },
    sort: 8,
  },
  ...([
    ["sichuan", "川味初体验", "川菜", "🌶️"], ["yuecai", "粤味鲜赏", "粤菜", "🥬"],
    ["hunan", "湘味探客", "湘菜", "🔥"], ["shandong", "鲁味寻鲜", "鲁菜", "🦐"],
    ["fujian", "闽味寻踪", "闽菜", "🐚"], ["anhui", "徽州食记", "徽菜", "🏡"],
    ["dongbei", "东北食客", "东北菜", "🥔"], ["xinjiang", "西域食记", "新疆菜", "🍗"],
    ["guangxi", "桂味寻香", "广西菜", "🍜"], ["guizhou", "黔味探秘", "贵州菜", "🥘"],
    ["shaanxi", "关中面客", "陕西菜", "🍝"], ["japanese-home", "和风日常", "日式家庭料理", "🍱"],
  ] as const).map(([tag, name, region, icon], i): BadgeDefSeed => ({
    id: `region_${tag}`, name, description: `完成一道${region}的打卡`, icon, category: "world",
    ruleType: "cuisine_tag_count", ruleParams: { tag, distinct: 1 }, sort: 9 + i,
  })),
];
