import type { DB } from "../db";
import communityRecipes from "./data/community-recipes.json";
import photoSources from "./data/photo-sources.json";
import worldRecipes from "./data/world-recipes.json";

export const COLOR_TAGS = ["红", "橙", "黄", "绿", "白", "棕", "黑"] as const;
export type ColorTag = (typeof COLOR_TAGS)[number];

export interface RecipeSeed {
  id: string;
  cuisineId: string;
  name: string;
  nameEn: string;
  emoji: string;
  kcal: number;
  minutes: number;
  difficulty: number;
  tasteTags: string[];
  ingredients: { name: string; amount: string }[];
  tools: string[];
  steps: { text: string; seconds?: number; tip?: string }[];
  soloTip: string;
  colorTag: ColorTag;
  imagePath?: string;
  sourceUrl?: string;
  sourceName?: string;
  sourceNote?: string;
  servingsNote?: string;
  originalInstructions?: string;
  originalSourceUrl?: string | null;
  imageCredit?: string;
}

export const ORIGINAL_RECIPE_SEEDS: RecipeSeed[] = [
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
  {
    id: "RC_SC_002", cuisineId: "sichuan", name: "宫保鸡丁", nameEn: "Kung Pao Chicken", emoji: "🥜",
    kcal: 520, minutes: 25, difficulty: 2, tasteTags: ["甜辣", "微酸"],
    ingredients: [
      { name: "鸡腿肉", amount: "200g" }, { name: "油炸花生米", amount: "40g" },
      { name: "干辣椒", amount: "6 个" }, { name: "花椒", amount: "1 茶匙" },
      { name: "大葱", amount: "半根" }, { name: "生抽", amount: "1 汤匙" },
      { name: "香醋", amount: "2 茶匙" }, { name: "白糖", amount: "2 茶匙" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "鸡腿肉切 1.5cm 丁，加生抽与淀粉抓匀腌 10 分钟。", seconds: 600, tip: "腌够时间鸡肉才滑嫩" },
      { text: "热锅下油爆香干辣椒与花椒，约 30 秒出香味。", seconds: 30, tip: "辣椒变深红立刻下鸡肉，别炒糊" },
      { text: "下鸡丁大火翻炒至表面变白，约 2 分钟。", seconds: 120 },
      { text: "倒入生抽、香醋、白糖调成的碗汁，翻匀收浓。", seconds: 60 },
      { text: "关火撒花生米与葱段，快速拌匀出锅。", tip: "花生米最后放才保持酥脆" },
    ],
    soloTip: "花生米一次买小袋装，开封后密封冷冻可放一个月。",
    colorTag: "棕",
  },
  {
    id: "RC_SC_003", cuisineId: "sichuan", name: "鱼香茄子", nameEn: "Yu-Xiang Eggplant", emoji: "🍆",
    kcal: 380, minutes: 25, difficulty: 2, tasteTags: ["咸甜", "微辣"],
    ingredients: [
      { name: "长茄子", amount: "1 根" }, { name: "猪肉末", amount: "50g" },
      { name: "泡椒末", amount: "1 汤匙" }, { name: "蒜末", amount: "3 瓣量" },
      { name: "姜末", amount: "1 小块" }, { name: "香醋", amount: "2 汤匙" },
      { name: "白糖", amount: "1 汤匙" }, { name: "淀粉", amount: "1 茶匙" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "茄子切滚刀块，撒少许盐抓匀静置 10 分钟挤去水分。", seconds: 600, tip: "杀过水的茄子吸油少很多" },
      { text: "中火下茄子煎至表面微皱变软，约 4 分钟盛出。", seconds: 240 },
      { text: "余油炒香肉末、泡椒末、姜蒜末，约 1 分钟。", seconds: 60 },
      { text: "倒回茄子，淋入醋糖淀粉调的鱼香汁，中火烧 2 分钟。", seconds: 120 },
      { text: "收汁至浓稠挂糊，撒葱花翻匀出锅。" },
    ],
    soloTip: "茄子剖开后切口包保鲜膜，冷藏 3 天不氧化发黑。",
    colorTag: "棕",
  },
  {
    id: "RC_SC_004", cuisineId: "sichuan", name: "回锅肉", nameEn: "Twice-Cooked Pork", emoji: "🥓",
    kcal: 650, minutes: 30, difficulty: 3, tasteTags: ["咸鲜", "酱香"],
    ingredients: [
      { name: "带皮五花肉", amount: "200g" }, { name: "青蒜苗", amount: "2 根" },
      { name: "郫县豆瓣酱", amount: "1 汤匙" }, { name: "甜面酱", amount: "1 茶匙" },
      { name: "豆豉", amount: "1 茶匙" }, { name: "姜片", amount: "3 片" },
      { name: "料酒", amount: "1 汤匙" }, { name: "生抽", amount: "1 茶匙" },
    ],
    tools: ["炒锅", "煮锅"],
    steps: [
      { text: "五花肉冷水下锅，加姜片料酒煮 15 分钟至八成熟。", seconds: 900, tip: "筷子能轻松插入即关火" },
      { text: "捞出过凉水，切成 2mm 薄片，越薄越容易出灯盏窝。", seconds: 60 },
      { text: "锅中少油下肉片中火煸至卷曲吐油，约 3 分钟。", seconds: 180, tip: "肉片卷成小碗状就是到位了" },
      { text: "拨开肉片下豆瓣酱、豆豉、甜面酱炒出红油，约 1 分钟。", seconds: 60 },
      { text: "下蒜苗段大火翻匀，加生抽调味立刻出锅。" },
    ],
    soloTip: "煮好的五花肉冷藏后可放 3 天，随时切片回锅。",
    colorTag: "棕",
  },
  {
    id: "RC_SC_005", cuisineId: "sichuan", name: "水煮肉片", nameEn: "Poached Pork in Chili Oil", emoji: "🌶️",
    kcal: 560, minutes: 35, difficulty: 3, tasteTags: ["麻辣", "重口"],
    ingredients: [
      { name: "猪里脊", amount: "200g" }, { name: "黄豆芽", amount: "100g" },
      { name: "干辣椒", amount: "8 个" }, { name: "花椒", amount: "1 汤匙" },
      { name: "郫县豆瓣酱", amount: "1 汤匙" }, { name: "蛋清", amount: "1 个" },
      { name: "淀粉", amount: "1 汤匙" }, { name: "蒜末", amount: "3 瓣量" },
    ],
    tools: ["炒锅", "深汤锅"],
    steps: [
      { text: "里脊逆纹切 2mm 薄片，加蛋清、淀粉、盐抓匀腌 15 分钟。", seconds: 900, tip: "顺纹切会柴，一定逆着纹理切" },
      { text: "豆芽焯水 1 分钟垫在碗底。", seconds: 60 },
      { text: "锅中炒香豆瓣酱与一半花椒，加水烧开后下肉片汆 90 秒。", seconds: 90, tip: "肉片变色即捞，久煮会老" },
      { text: "肉片连汤倒入碗中，表面铺蒜末与剩余干辣椒花椒。" },
      { text: "热油烧至冒烟淋在香料上激香即可。" },
    ],
    soloTip: "里脊一次用不完可分小袋冷冻，做前提前冷藏解冻更嫩。",
    colorTag: "红",
  },
  {
    id: "RC_SC_006", cuisineId: "sichuan", name: "红油抄手", nameEn: "Chili Oil Wontons", emoji: "🥟",
    kcal: 480, minutes: 30, difficulty: 3, tasteTags: ["酸辣", "鲜香"],
    ingredients: [
      { name: "抄手皮", amount: "20 张" }, { name: "猪肉末", amount: "150g" },
      { name: "虾仁", amount: "50g" }, { name: "姜末", amount: "1 茶匙" },
      { name: "辣椒油", amount: "2 汤匙" }, { name: "生抽", amount: "1 汤匙" },
      { name: "香醋", amount: "1 汤匙" }, { name: "熟芝麻", amount: "1 茶匙" },
    ],
    tools: ["汤锅", "大碗"],
    steps: [
      { text: "肉末、虾仁剁碎拌姜末与少许盐，顺一个方向搅打上劲。", seconds: 120, tip: "搅到黏连拉丝，口感才弹" },
      { text: "取抄手皮包入馅料，对折捏紧两角成元宝状。" },
      { text: "水沸后下抄手下锅，煮 4 分钟至全部浮起。", seconds: 240, tip: "中途点一次冷水更筋道" },
      { text: "碗中调辣椒油、生抽、香醋与蒜水做底。" },
      { text: "抄手捞入碗中，淋汤汁撒芝麻与葱花拌匀。" },
    ],
    soloTip: "多包的抄手平铺冷冻定型后装袋，可存两周随吃随煮。",
    colorTag: "红",
  },

  /* ====== 粤菜 yuecai（6 道）====== */
  {
    id: "RC_YU_001", cuisineId: "yuecai", name: "白灼虾", nameEn: "Blanched Shrimp", emoji: "🍤",
    kcal: 320, minutes: 15, difficulty: 1, tasteTags: ["清鲜", "原味"],
    ingredients: [
      { name: "鲜海虾", amount: "8 只" }, { name: "姜片", amount: "4 片" },
      { name: "小葱", amount: "2 根" }, { name: "蒸鱼豉油", amount: "2 汤匙" },
      { name: "料酒", amount: "1 汤匙" }, { name: "香油", amount: "几滴" },
    ],
    tools: ["汤锅", "小碟"],
    steps: [
      { text: "虾剪去长须，用牙签从背部挑出虾线。" },
      { text: "锅中水加姜片、葱段与料酒烧至沸腾。" },
      { text: "下虾煮 2 分钟，虾身弯曲变红立即捞出。", seconds: 120, tip: "过火 30 秒肉质就变柴" },
      { text: "捞出立刻过冰水，虾肉紧实弹牙。", seconds: 30 },
      { text: "蒸鱼豉油加香油与姜丝做蘸碟，剥壳蘸食。" },
    ],
    soloTip: "活虾一次吃不完，冲净沥干直接冷冻，鲜度能锁一个月。",
    colorTag: "白",
  },
  {
    id: "RC_YU_002", cuisineId: "yuecai", name: "豉汁蒸排骨", nameEn: "Steamed Pork Ribs", emoji: "🍖",
    kcal: 540, minutes: 40, difficulty: 3, tasteTags: ["豉香", "咸鲜"],
    ingredients: [
      { name: "猪肋排", amount: "300g" }, { name: "豆豉", amount: "1 汤匙" },
      { name: "蒜末", amount: "4 瓣量" }, { name: "生抽", amount: "1 汤匙" },
      { name: "蚝油", amount: "1 茶匙" }, { name: "淀粉", amount: "1 汤匙" },
      { name: "白糖", amount: "1 茶匙" }, { name: "小葱", amount: "1 根" },
    ],
    tools: ["蒸锅", "深盘"],
    steps: [
      { text: "排骨剁 3cm 段，清水浸泡 20 分钟去血水后沥干。", seconds: 1200, tip: "泡到水清，蒸出来才不腥" },
      { text: "豆豉与蒜末剁碎，与生抽蚝油糖拌匀成豉汁。" },
      { text: "排骨裹匀豉汁与淀粉，腌 15 分钟。", seconds: 900 },
      { text: "平铺盘中，水开后大火蒸 12 分钟。", seconds: 720, tip: "不要堆叠，铺平受热才均匀" },
      { text: "出锅撒葱花，静置 2 分钟再开盖更入味。", seconds: 120 },
    ],
    soloTip: "腌好的排骨分份冷冻，吃前直接上锅蒸，省事又新鲜。",
    colorTag: "棕",
  },
  {
    id: "RC_YU_003", cuisineId: "yuecai", name: "蒜蓉菜心", nameEn: "Garlic Choy Sum", emoji: "🥬",
    kcal: 180, minutes: 10, difficulty: 1, tasteTags: ["清甜", "蒜香"],
    ingredients: [
      { name: "菜心", amount: "250g" }, { name: "蒜末", amount: "3 瓣量" },
      { name: "蚝油", amount: "1 茶匙" }, { name: "生抽", amount: "1 茶匙" },
      { name: "白糖", amount: "半茶匙" }, { name: "食用油", amount: "1 汤匙" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "菜心剥去老叶，粗梗纵向剖开便于成熟一致。" },
      { text: "水沸加少许油盐，菜心焯 40 秒立刻捞出。", seconds: 40, tip: "加油焯能保持翠绿不黄" },
      { text: "锅中热油小火爆香蒜末至微金黄。" },
      { text: "加蚝油、生抽、糖与两汤匙水烧成薄芡。" },
      { text: "淋在菜心上即可，保持脆嫩口感。" },
    ],
    soloTip: "菜心买回不要水洗，用厨房纸包好冷藏能多放两天。",
    colorTag: "绿",
  },
  {
    id: "RC_YU_004", cuisineId: "yuecai", name: "广式腊味煲仔饭", nameEn: "Claypot Rice", emoji: "🍚",
    kcal: 680, minutes: 45, difficulty: 3, tasteTags: ["腊香", "锅巴焦脆"],
    ingredients: [
      { name: "丝苗米", amount: "100g" }, { name: "广式腊肠", amount: "1 根" },
      { name: "腊肉", amount: "30g" }, { name: "小青菜", amount: "3 棵" },
      { name: "生抽", amount: "1 汤匙" }, { name: "老抽", amount: "半茶匙" },
      { name: "白糖", amount: "1 茶匙" }, { name: "香油", amount: "几滴" },
    ],
    tools: ["砂锅", "小碗"],
    steps: [
      { text: "米淘净后加水（米水比 1:1.2），浸泡 20 分钟。", seconds: 1200 },
      { text: "腊肠腊肉切薄片，青菜焯 30 秒备用。", seconds: 30 },
      { text: "砂锅加盖中火煮开转小火焖 8 分钟至表面收水。", seconds: 480, tip: "听到底部轻微噼啪声说明锅巴在形成" },
      { text: "铺上腊味片继续焖 6 分钟，关火再焖 3 分钟。", seconds: 360, tip: "关火焖是让腊味油脂渗进饭里的关键" },
      { text: "摆入青菜，淋生抽老抽糖调的豉油，拌匀开吃。" },
    ],
    soloTip: "砂锅用前先泡水 30 分钟，能明显减少开裂。",
    colorTag: "棕",
  },
  {
    id: "RC_YU_005", cuisineId: "yuecai", name: "虾仁滑蛋", nameEn: "Shrimp Scrambled Eggs", emoji: "🥚",
    kcal: 380, minutes: 15, difficulty: 1, tasteTags: ["滑嫩", "鲜甜"],
    ingredients: [
      { name: "鸡蛋", amount: "3 个" }, { name: "虾仁", amount: "80g" },
      { name: "牛奶", amount: "2 汤匙" }, { name: "淀粉", amount: "1 茶匙" },
      { name: "盐", amount: "半茶匙" }, { name: "小葱", amount: "1 根" },
    ],
    tools: ["不粘锅", "锅铲"],
    steps: [
      { text: "虾仁去虾线，加盐与淀粉抓洗后擦干。" },
      { text: "鸡蛋加牛奶和盐打散，搅到蛋液完全均匀。" },
      { text: "小火热锅下虾仁滑炒 1 分钟至变色盛出。", seconds: 60 },
      { text: "倒入蛋液，用铲子从边缘向中心轻推，约 40 秒。", seconds: 40, tip: "全程小火，蛋液半凝就离火" },
      { text: "蛋液七分熟时倒回虾仁拌两下，撒葱花出锅。" },
    ],
    soloTip: "打蛋时加牛奶比加水更香，也能防止蛋体变老。",
    colorTag: "黄",
  },
  {
    id: "RC_YU_006", cuisineId: "yuecai", name: "咸蛋蒸肉饼", nameEn: "Steamed Pork Patty", emoji: "🥚",
    kcal: 520, minutes: 25, difficulty: 2, tasteTags: ["咸香", "嫩滑"],
    ingredients: [
      { name: "猪肉末", amount: "200g" }, { name: "咸蛋黄", amount: "1 个" },
      { name: "马蹄", amount: "3 个" }, { name: "淀粉", amount: "1 汤匙" },
      { name: "生抽", amount: "1 汤匙" }, { name: "白糖", amount: "半茶匙" },
      { name: "姜末", amount: "1 茶匙" }, { name: "香油", amount: "几滴" },
    ],
    tools: ["蒸锅", "浅盘"],
    steps: [
      { text: "马蹄去皮切细粒，与肉末、姜末拌匀。" },
      { text: "加生抽、糖、淀粉与两汤匙水，顺一个方向搅至起胶。", seconds: 120, tip: "加水搅打是让肉饼多汁的秘诀" },
      { text: "肉馅摊成 1.5cm 厚圆饼，中间按一个凹槽。" },
      { text: "咸蛋黄压扁放入凹槽，水开后大火蒸 12 分钟。", seconds: 720 },
      { text: "出锅淋几滴香油，静置 1 分钟再切块。", seconds: 60 },
    ],
    soloTip: "肉饼一次做两份，冷藏后煎一下就是第二天的早餐。",
    colorTag: "棕",
  },

  /* ====== 日本-关西 kansai（5 道）====== */
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
      { text: "刷大阪烧酱、撒木鱼花与海苔粉出锅。" },
    ],
    soloTip: "卷心菜丝一次切多了，用厨房纸包好冷藏，3 天内仍可做第二次。",
    colorTag: "黄",
  },
  {
    id: "RC_JP_002", cuisineId: "kansai", name: "章鱼烧", nameEn: "Takoyaki", emoji: "🐙",
    kcal: 420, minutes: 35, difficulty: 3, tasteTags: ["咸鲜", "外脆内软"],
    ingredients: [
      { name: "低筋面粉", amount: "80g" }, { name: "鸡蛋", amount: "1 个" },
      { name: "熟章鱼丁", amount: "60g" }, { name: "红姜碎", amount: "1 汤匙" },
      { name: "葱花", amount: "2 汤匙" }, { name: "章鱼烧酱", amount: "2 汤匙" },
      { name: "蛋黄酱", amount: "1 汤匙" }, { name: "木鱼花", amount: "1 把" },
    ],
    tools: ["章鱼烧盘", "竹签"],
    steps: [
      { text: "面粉、鸡蛋加 200ml 水与少许生抽调成稀面糊。" },
      { text: "章鱼烧盘刷油中火预热 3 分钟。", seconds: 180, tip: "面糊下盘要有滋滋声才算够热" },
      { text: "每孔倒满面糊，放章鱼丁、红姜与葱花。" },
      { text: "边缘凝固后用竹签转 90 度，把外溢面糊塞入孔中，约 2 分钟。", seconds: 120 },
      { text: "持续转动 4 分钟至通体金黄，装盘刷酱挤蛋黄酱撒木鱼花。", seconds: 240 },
    ],
    soloTip: "章鱼丁可提前煮好冷冻，早上取出即用，省去预处理。",
    colorTag: "棕",
  },
  {
    id: "RC_JP_003", cuisineId: "kansai", name: "亲子丼", nameEn: "Oyakodon", emoji: "🍗",
    kcal: 540, minutes: 20, difficulty: 2, tasteTags: ["咸甜", "滑蛋"],
    ingredients: [
      { name: "鸡腿肉", amount: "150g" }, { name: "鸡蛋", amount: "2 个" },
      { name: "洋葱", amount: "半个" }, { name: "日式高汤", amount: "120ml" },
      { name: "生抽", amount: "1 汤匙" }, { name: "味淋", amount: "1 汤匙" },
      { name: "白糖", amount: "1 茶匙" }, { name: "米饭", amount: "1 碗" },
    ],
    tools: ["小锅", "碗"],
    steps: [
      { text: "鸡腿去骨切 3cm 块，洋葱切细丝。" },
      { text: "小锅中加高汤、生抽、味淋、糖煮开，下洋葱煮 2 分钟。", seconds: 120 },
      { text: "下鸡肉块中小火煮 5 分钟至熟透。", seconds: 300, tip: "鸡肉铺平不重叠，受热才均匀" },
      { text: "蛋液打散分两次淋入，第一次凝固后再淋第二次。", seconds: 40, tip: "分两次淋才有层次感的半熟蛋" },
      { text: "关火盖盖焖 30 秒，整锅滑到热米饭上。", seconds: 30 },
    ],
    soloTip: "高汤一次煮一锅分格冷冻，做丼饭时取一块丢锅里即可。",
    colorTag: "黄",
  },
  {
    id: "RC_JP_004", cuisineId: "kansai", name: "出汁卷玉子", nameEn: "Dashimaki Tamago", emoji: "🍳",
    kcal: 280, minutes: 20, difficulty: 3, tasteTags: ["清鲜", "微甜"],
    ingredients: [
      { name: "鸡蛋", amount: "3 个" }, { name: "日式高汤", amount: "60ml" },
      { name: "味淋", amount: "1 茶匙" }, { name: "生抽", amount: "半茶匙" },
      { name: "盐", amount: "一小撮" }, { name: "白萝卜泥", amount: "2 汤匙" },
    ],
    tools: ["方形玉子烧锅", "筷子"],
    steps: [
      { text: "鸡蛋加高汤、味淋、生抽与盐充分打散，过筛去泡沫。", tip: "过筛后蛋皮才不会出现气孔" },
      { text: "玉子锅中小火刷薄油，倒入 1/3 蛋液铺满锅底。" },
      { text: "表面半凝固时从一端卷起，推回锅边，约 40 秒。", seconds: 40 },
      { text: "重复刷油倒蛋液卷叠三次，直到蛋液用完。", seconds: 120, tip: "每次倒液前先抬起已卷部分让新液流入底下" },
      { text: "出锅稍放凉，用竹帘定型 2 分钟再切段。", seconds: 120 },
    ],
    soloTip: "剩下的白萝卜泥挤干水分拌酱油，就是一碟现成的下饭小菜。",
    colorTag: "黄",
  },
  {
    id: "RC_JP_005", cuisineId: "kansai", name: "掛乌冬", nameEn: "Kake Udon", emoji: "🍜",
    kcal: 460, minutes: 15, difficulty: 1, tasteTags: ["清鲜", "温和"],
    ingredients: [
      { name: "乌冬面", amount: "1 人份" }, { name: "日式高汤", amount: "350ml" },
      { name: "生抽", amount: "1 汤匙" }, { name: "味淋", amount: "1 汤匙" },
      { name: "小葱", amount: "1 根" }, { name: "天妇罗碎", amount: "1 汤匙" },
    ],
    tools: ["汤锅", "面碗"],
    steps: [
      { text: "高汤加生抽与味淋煮开，尝味后调整咸淡。" },
      { text: "另起一锅水煮沸，下乌冬煮 3 分钟。", seconds: 180, tip: "冷冻乌冬不要解冻，直接下锅" },
      { text: "乌冬捞出用冷水冲去表面淀粉，口感更弹。" },
      { text: "面沥干放入碗中，浇上滚烫的汤汁。" },
      { text: "撒葱花与天妇罗碎，趁热吸溜着吃。" },
    ],
    soloTip: "乌冬汤底煮多了冷藏可存 3 天，早晨热一碗非常快。",
    colorTag: "白",
  },

  /* ====== 泰国-泰北 thai-north（6 道）====== */
  {
    id: "RC_TH_001", cuisineId: "thai-north", name: "泰北咖喱面", nameEn: "Khao Soi", emoji: "🍛",
    kcal: 620, minutes: 40, difficulty: 3, tasteTags: ["椰香", "微辣"],
    ingredients: [
      { name: "鸡蛋面", amount: "1 人份" }, { name: "鸡腿肉", amount: "150g" },
      { name: "椰浆", amount: "200ml" }, { name: "咖喱酱", amount: "2 汤匙" },
      { name: "鱼露", amount: "1 汤匙" }, { name: "青柠", amount: "1 个" },
      { name: "炸面圈", amount: "1 小把" }, { name: "腌芥菜", amount: "1 汤匙" },
    ],
    tools: ["汤锅", "炒锅"],
    steps: [
      { text: "鸡腿切块，咖喱酱先用两汤匙椰浆小火炒出香味。", seconds: 120, tip: "炒到表面浮出红油再加水" },
      { text: "倒入剩余椰浆与 200ml 水，下鸡块煮 15 分钟。", seconds: 900 },
      { text: "加鱼露与糖调味，挤半个青柠汁平衡油腻。", seconds: 30 },
      { text: "鸡蛋面另锅煮 3 分钟捞出垫碗，浇上咖喱汤汁。", seconds: 180 },
      { text: "表面撒炸面圈、腌芥菜，配青柠角上桌。" },
    ],
    soloTip: "咖喱汤底一次煮两人份，剩下一份冷藏次日照样好吃。",
    colorTag: "黄",
  },
  {
    id: "RC_TH_002", cuisineId: "thai-north", name: "香茅烤鸡", nameEn: "Grilled Lemongrass Chicken", emoji: "🍗",
    kcal: 540, minutes: 45, difficulty: 3, tasteTags: ["香草", "焦香"],
    ingredients: [
      { name: "鸡腿排", amount: "1 块" }, { name: "香茅", amount: "2 根" },
      { name: "蒜末", amount: "3 瓣量" }, { name: "鱼露", amount: "1 汤匙" },
      { name: "椰糖", amount: "1 茶匙" }, { name: "青柠", amount: "1 个" },
      { name: "香菜", amount: "2 根" }, { name: "黑胡椒", amount: "半茶匙" },
    ],
    tools: ["烤箱", "烤盘"],
    steps: [
      { text: "香茅取白色部分切碎，与蒜末、鱼露、椰糖、黑胡椒拌成腌料。" },
      { text: "鸡腿排用叉子扎孔，抹匀腌料冷藏 20 分钟。", seconds: 1200, tip: "扎孔能让腌料渗进肉里" },
      { text: "烤箱 200℃ 预热，鸡皮朝上烤 15 分钟。", seconds: 900 },
      { text: "取出翻面再烤 8 分钟，最后 2 分钟调上火炙烤上色。", seconds: 480, tip: "最后高温炙烤才有焦糖化的脆皮" },
      { text: "静置 3 分钟切块，挤青柠汁撒香菜。", seconds: 180 },
    ],
    soloTip: "香茅用不完可切段冷冻，煮汤烤鸡随手取用。",
    colorTag: "棕",
  },
  {
    id: "RC_TH_003", cuisineId: "thai-north", name: "打抛猪肉饭", nameEn: "Pad Krapow Moo", emoji: "🌿",
    kcal: 580, minutes: 15, difficulty: 1, tasteTags: ["咸辣", "罗勒香"],
    ingredients: [
      { name: "猪肉末", amount: "150g" }, { name: "九层塔", amount: "1 把" },
      { name: "蒜末", amount: "3 瓣量" }, { name: "小米辣", amount: "2 个" },
      { name: "鱼露", amount: "1 汤匙" }, { name: "蚝油", amount: "1 茶匙" },
      { name: "鸡蛋", amount: "1 个" }, { name: "米饭", amount: "1 碗" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "蒜末与小米辣入锅爆香，约 20 秒。", seconds: 20 },
      { text: "下猪肉末大火炒散，炒到微微焦香，约 2 分钟。", seconds: 120, tip: "肉末炒出焦边才有打抛的锅气" },
      { text: "加鱼露、蚝油与少许糖调味，翻炒 30 秒。", seconds: 30 },
      { text: "关火前撒入九层塔，用余温拌匀。" },
      { text: "盛在米饭上，配一个边缘煎脆的荷包蛋。" },
    ],
    soloTip: "九层塔买回插在水杯里放台面，能鲜两天不蔫。",
    colorTag: "棕",
  },
  {
    id: "RC_TH_004", cuisineId: "thai-north", name: "冬阴功汤", nameEn: "Tom Yum Goong", emoji: "🍤",
    kcal: 320, minutes: 25, difficulty: 2, tasteTags: ["酸辣", "香茅味"],
    ingredients: [
      { name: "鲜虾", amount: "6 只" }, { name: "香茅", amount: "1 根" },
      { name: "南姜", amount: "3 片" }, { name: "柠檬叶", amount: "4 片" },
      { name: "草菇", amount: "6 个" }, { name: "鱼露", amount: "1 汤匙" },
      { name: "青柠", amount: "2 个" }, { name: "泰式辣椒膏", amount: "1 茶匙" },
    ],
    tools: ["汤锅", "漏勺"],
    steps: [
      { text: "虾去壳留头，虾头下锅小火煸出虾油，约 2 分钟。", seconds: 120, tip: "虾头是汤底鲜味的来源，别丢" },
      { text: "加水、香茅段、南姜片与柠檬叶，煮开转小火 8 分钟。", seconds: 480 },
      { text: "下草菇与辣椒膏，煮 3 分钟。", seconds: 180 },
      { text: "放虾仁煮 2 分钟至变色。", seconds: 120, tip: "虾仁最后下，久煮会失去弹性" },
      { text: "关火再加鱼露与青柠汁，酸味才不会因加热变苦。" },
    ],
    soloTip: "香茅、南姜、柠檬叶一次配好冷冻成料包，下次煮汤直接丢。",
    colorTag: "橙",
  },
  {
    id: "RC_TH_005", cuisineId: "thai-north", name: "泰式炒河粉", nameEn: "Pad Thai", emoji: "🍜",
    kcal: 610, minutes: 20, difficulty: 2, tasteTags: ["酸甜", "花生香"],
    ingredients: [
      { name: "干河粉", amount: "80g" }, { name: "虾仁", amount: "6 只" },
      { name: "鸡蛋", amount: "1 个" }, { name: "豆芽", amount: "1 把" },
      { name: "罗望子酱", amount: "1 汤匙" }, { name: "鱼露", amount: "1 汤匙" },
      { name: "棕榈糖", amount: "1 茶匙" }, { name: "碎花生", amount: "1 汤匙" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "河粉冷水浸泡 30 分钟至变软但仍带韧性。", seconds: 1800, tip: "泡软就够，别泡到发黏" },
      { text: "锅中炒香虾仁至变色盛出，约 1 分钟。", seconds: 60 },
      { text: "下蛋液炒散，加河粉与罗望子酱、鱼露、糖，大火翻匀 2 分钟。", seconds: 120 },
      { text: "倒回虾仁与豆芽，快速翻炒 30 秒保持脆感。", seconds: 30 },
      { text: "装盘撒碎花生，配青柠角与辣椒粉。" },
    ],
    soloTip: "罗望子酱、鱼露、糖按 3:2:1 调好装瓶，随时能炒一盘。",
    colorTag: "黄",
  },
  {
    id: "RC_TH_006", cuisineId: "thai-north", name: "青木瓜沙拉", nameEn: "Som Tam", emoji: "🥗",
    kcal: 180, minutes: 15, difficulty: 1, tasteTags: ["酸辣", "爽脆"],
    ingredients: [
      { name: "青木瓜", amount: "200g" }, { name: "小番茄", amount: "4 个" },
      { name: "长豆角", amount: "2 根" }, { name: "花生米", amount: "1 汤匙" },
      { name: "小米辣", amount: "2 个" }, { name: "鱼露", amount: "1 汤匙" },
      { name: "青柠", amount: "1 个" }, { name: "棕榈糖", amount: "1 茶匙" },
    ],
    tools: ["木臼", "刨丝器"],
    steps: [
      { text: "青木瓜去皮刨成长丝，泡冰水 5 分钟更脆。", seconds: 300 },
      { text: "木臼中捣碎小米辣与蒜，加入棕榈糖与鱼露。" },
      { text: "放长豆角与小番茄轻捣 20 秒，让汁水渗出。", seconds: 20, tip: "捣而不砸，别把豆角捣烂" },
      { text: "加木瓜丝与青柠汁，用杵轻翻拌匀。" },
      { text: "装盘撒花生米，趁脆口食用。" },
    ],
    soloTip: "青木瓜刨丝后冷藏泡冰水，可提前一晚备好，第二天照样脆。",
    colorTag: "绿",
  },

  /* ====== 印度-北印 north-indian（6 道）====== */
  {
    id: "RC_IN_001", cuisineId: "north-indian", name: "黄油鸡", nameEn: "Butter Chicken", emoji: "🍗",
    kcal: 680, minutes: 50, difficulty: 3, tasteTags: ["奶香", "微辣"],
    ingredients: [
      { name: "鸡腿肉", amount: "250g" }, { name: "原味酸奶", amount: "3 汤匙" },
      { name: "番茄泥", amount: "200g" }, { name: "黄油", amount: "20g" },
      { name: "淡奶油", amount: "50ml" }, { name: "姜蒜泥", amount: "1 汤匙" },
      { name: "咖喱粉", amount: "1 汤匙" }, { name: "孜然粉", amount: "1 茶匙" },
    ],
    tools: ["炒锅", "搅拌机"],
    steps: [
      { text: "鸡腿切块，用酸奶、姜蒜泥与一半咖喱粉腌 20 分钟。", seconds: 1200, tip: "酸奶腌能让鸡肉更嫩并去腥" },
      { text: "平底锅少油把鸡块煎至表面焦香，约 5 分钟盛出。", seconds: 300 },
      { text: "锅中化黄油，炒香孜然粉与剩余咖喱粉 30 秒。", seconds: 30, tip: "干香料遇油才释放香气" },
      { text: "倒入番茄泥小火煮 10 分钟至浓稠，用搅拌机打成顺滑酱汁。", seconds: 600 },
      { text: "酱汁回锅下鸡块煮 8 分钟，最后淋淡奶油拌匀。", seconds: 480 },
    ],
    soloTip: "酱汁可一次做双份冷冻，鸡肉现煎现放，风味几乎不损失。",
    colorTag: "橙",
  },
  {
    id: "RC_IN_002", cuisineId: "north-indian", name: "咖喱鹰嘴豆", nameEn: "Chana Masala", emoji: "🫘",
    kcal: 420, minutes: 30, difficulty: 2, tasteTags: ["香辛", "微酸"],
    ingredients: [
      { name: "熟鹰嘴豆", amount: "200g" }, { name: "洋葱", amount: "半个" },
      { name: "番茄", amount: "1 个" }, { name: "姜蒜泥", amount: "1 汤匙" },
      { name: "咖喱粉", amount: "2 茶匙" }, { name: "孜然粒", amount: "1 茶匙" },
      { name: "青柠", amount: "半个" }, { name: "香菜", amount: "2 根" },
    ],
    tools: ["深锅", "木铲"],
    steps: [
      { text: "锅中热油爆香孜然粒至微微跳动，约 20 秒。", seconds: 20, tip: "孜然跳动就是油温刚好的信号" },
      { text: "下洋葱丁炒至透明微黄，约 4 分钟。", seconds: 240 },
      { text: "加姜蒜泥与咖喱粉炒 1 分钟，再下番茄丁炒软。", seconds: 60 },
      { text: "倒入鹰嘴豆与 150ml 水，小火炖 10 分钟。", seconds: 600 },
      { text: "压碎少量豆子让汤汁变稠，挤青柠汁撒香菜。" },
    ],
    soloTip: "干鹰嘴豆一次泡煮一大批冷冻，随时取用省事得多。",
    colorTag: "棕",
  },
  {
    id: "RC_IN_003", cuisineId: "north-indian", name: "鸡肉香饭", nameEn: "Chicken Biryani", emoji: "🍚",
    kcal: 720, minutes: 60, difficulty: 4, tasteTags: ["层次香料", "油润"],
    ingredients: [
      { name: "长粒香米", amount: "100g" }, { name: "鸡腿肉", amount: "200g" },
      { name: "原味酸奶", amount: "4 汤匙" }, { name: "洋葱", amount: "1 个" },
      { name: "藏红花", amount: "一小撮" }, { name: "姜蒜泥", amount: "1 汤匙" },
      { name: "印度香饭香料", amount: "1 汤匙" }, { name: "黄油", amount: "15g" },
    ],
    tools: ["厚底锅", "平底锅"],
    steps: [
      { text: "洋葱切丝炸至金棕酥脆，取出半份留作点缀。", seconds: 300, tip: "炸洋葱是香饭的灵魂，别省这一步" },
      { text: "鸡肉用酸奶、姜蒜泥与香料腌 20 分钟。", seconds: 1200 },
      { text: "香米煮至七分熟捞出沥干，米粒应仍有硬芯。" },
      { text: "厚底锅底层铺鸡肉，盖上米饭，撒藏红花水与黄油，密封小火焖 20 分钟。", seconds: 1200, tip: "锅盖边用湿布围住防止蒸汽跑掉" },
      { text: "开盖后从底部轻轻翻拌，撒炸洋葱上桌。" },
    ],
    soloTip: "香饭隔夜更入味，剩下的直接微波就是一顿好饭。",
    colorTag: "黄",
  },
  {
    id: "RC_IN_004", cuisineId: "north-indian", name: "菠菜奶酪", nameEn: "Palak Paneer", emoji: "🧀",
    kcal: 460, minutes: 30, difficulty: 2, tasteTags: ["清香", "奶香"],
    ingredients: [
      { name: "菠菜", amount: "250g" }, { name: "印度奶酪", amount: "120g" },
      { name: "洋葱", amount: "半个" }, { name: "姜蒜泥", amount: "1 茶匙" },
      { name: "淡奶油", amount: "2 汤匙" }, { name: "孜然粒", amount: "1 茶匙" },
      { name: "咖喱粉", amount: "1 茶匙" }, { name: "盐", amount: "半茶匙" },
    ],
    tools: ["搅拌机", "深锅"],
    steps: [
      { text: "菠菜焯水 1 分钟立刻过冰水，保持翠绿。", seconds: 60, tip: "过冰水是颜色不发黄的关键" },
      { text: "菠菜加少量水打成细腻泥状备用。" },
      { text: "锅中爆香孜然粒与洋葱，加姜蒜泥与咖喱粉炒香。", seconds: 180 },
      { text: "倒入菠菜泥小火煮 5 分钟，中途别盖盖以免变黑。", seconds: 300 },
      { text: "奶酪切块放入，淋淡奶油煮 2 分钟即可。", seconds: 120 },
    ],
    soloTip: "菠菜泥可提前打好冷冻成小块，做菜时取一块直接下锅。",
    colorTag: "绿",
  },
  {
    id: "RC_IN_005", cuisineId: "north-indian", name: "蒜香馕", nameEn: "Garlic Naan", emoji: "🫓",
    kcal: 350, minutes: 40, difficulty: 3, tasteTags: ["蒜香", "麦香"],
    ingredients: [
      { name: "中筋面粉", amount: "150g" }, { name: "原味酸奶", amount: "3 汤匙" },
      { name: "酵母", amount: "2g" }, { name: "蒜末", amount: "2 瓣量" },
      { name: "黄油", amount: "10g" }, { name: "白糖", amount: "1 茶匙" },
      { name: "盐", amount: "半茶匙" }, { name: "香菜", amount: "1 根" },
    ],
    tools: ["平底锅", "擀面杖"],
    steps: [
      { text: "面粉、酵母、糖、盐、酸奶与温水揉成光滑面团。" },
      { text: "盖布室温发酵 20 分钟至体积略膨胀。", seconds: 1200, tip: "一人食不必等完全发透，略发就好" },
      { text: "面团分两份擀成 5mm 厚椭圆片，一面抹蒜末。" },
      { text: "平底锅中大火干烙 2 分钟，鼓起气泡后翻面再烙 1 分钟。", seconds: 120 },
      { text: "出锅刷黄油撒香菜，趁热撕着吃。" },
    ],
    soloTip: "面团可前一晚冷藏发酵，第二天早上直接擀开烙，早餐超快。",
    colorTag: "白",
  },
  {
    id: "RC_IN_006", cuisineId: "north-indian", name: "玛莎拉煎蛋", nameEn: "Egg Masala", emoji: "🥚",
    kcal: 300, minutes: 15, difficulty: 1, tasteTags: ["香辛", "番茄酸"],
    ingredients: [
      { name: "鸡蛋", amount: "2 个" }, { name: "番茄", amount: "1 个" },
      { name: "洋葱", amount: "小半个" }, { name: "姜蒜泥", amount: "1 茶匙" },
      { name: "咖喱粉", amount: "1 茶匙" }, { name: "香菜", amount: "1 根" },
      { name: "盐", amount: "半茶匙" }, { name: "食用油", amount: "1 汤匙" },
    ],
    tools: ["平底锅", "锅铲"],
    steps: [
      { text: "洋葱切丁炒至透明，加姜蒜泥与咖喱粉炒香。" },
      { text: "下番茄丁中火炒成糊状，约 3 分钟。", seconds: 180, tip: "炒到番茄出沙，酱底才够浓" },
      { text: "加 50ml 水煮开，调成略稠的酱汁。" },
      { text: "用勺子在酱汁中压出两个窝，磕入鸡蛋。" },
      { text: "盖盖小火焖 4 分钟至蛋白凝固，撒香菜。", seconds: 240, tip: "想溏心就减到 3 分钟" },
    ],
    soloTip: "这款酱底也能拌面，多炒一点装罐冷藏当万能浇头。",
    colorTag: "橙",
  },

  /* ====== 意大利-托斯卡纳 toscana（6 道）====== */
  {
    id: "RC_IT_001", cuisineId: "toscana", name: "番茄布鲁斯凯塔", nameEn: "Bruschetta", emoji: "🍅",
    kcal: 320, minutes: 15, difficulty: 1, tasteTags: ["清爽", "罗勒香"],
    ingredients: [
      { name: "乡村面包", amount: "2 片" }, { name: "小番茄", amount: "6 个" },
      { name: "蒜", amount: "1 瓣" }, { name: "罗勒叶", amount: "5 片" },
      { name: "特级初榨橄榄油", amount: "1 汤匙" }, { name: "海盐", amount: "半茶匙" },
      { name: "黑胡椒", amount: "少许" }, { name: "巴萨米克醋", amount: "1 茶匙" },
    ],
    tools: ["平底锅", "面包刀"],
    steps: [
      { text: "小番茄切丁，拌入撕碎的罗勒、橄榄油、海盐与醋。" },
      { text: "番茄混合物静置 10 分钟让汁水渗出。", seconds: 600, tip: "静置后味道会明显融合" },
      { text: "面包片干锅烙或烤 2 分钟至两面微焦。", seconds: 120 },
      { text: "趁热用生蒜瓣在面包表面来回擦出蒜香。" },
      { text: "铺上番茄混合物，撒黑胡椒与少许橄榄油。" },
    ],
    soloTip: "番茄馅拌好吃不完可冷藏，第二天配煎蛋也很不错。",
    colorTag: "红",
  },
  {
    id: "RC_IT_002", cuisineId: "toscana", name: "托斯卡纳白豆汤", nameEn: "Ribollita", emoji: "🍲",
    kcal: 380, minutes: 45, difficulty: 2, tasteTags: ["醇厚", "蔬菜甜"],
    ingredients: [
      { name: "熟白豆", amount: "200g" }, { name: "羽衣甘蓝", amount: "100g" },
      { name: "胡萝卜", amount: "半根" }, { name: "芹菜", amount: "1 根" },
      { name: "洋葱", amount: "半个" }, { name: "隔夜面包", amount: "1 片" },
      { name: "番茄膏", amount: "1 汤匙" }, { name: "橄榄油", amount: "2 汤匙" },
    ],
    tools: ["汤锅", "木勺"],
    steps: [
      { text: "洋葱、胡萝卜、芹菜切细丁，橄榄油小火炒软 8 分钟。", seconds: 480, tip: "这组蔬菜底炒透是汤好喝的关键" },
      { text: "加番茄膏炒 1 分钟，再倒入 600ml 水与白豆煮开。", seconds: 60 },
      { text: "转小火炖 15 分钟，期间压碎部分豆子让汤变浓。", seconds: 900 },
      { text: "下羽衣甘蓝煮 5 分钟至变软。", seconds: 300 },
      { text: "放入撕碎的面包煮 2 分钟，淋橄榄油出锅。", seconds: 120, tip: "面包吸饱汤汁才是正宗吃法" },
    ],
    soloTip: "这锅汤本来就靠隔夜面包，剩面包别扔，冷冻起来专门做汤。",
    colorTag: "绿",
  },
  {
    id: "RC_IT_003", cuisineId: "toscana", name: "蒜香橄榄油意面", nameEn: "Aglio e Olio", emoji: "🍝",
    kcal: 520, minutes: 15, difficulty: 1, tasteTags: ["蒜香", "微辛"],
    ingredients: [
      { name: "意大利面", amount: "100g" }, { name: "蒜", amount: "4 瓣" },
      { name: "干辣椒", amount: "1 个" }, { name: "欧芹", amount: "1 小把" },
      { name: "特级初榨橄榄油", amount: "3 汤匙" }, { name: "盐", amount: "1 汤匙" },
      { name: "黑胡椒", amount: "少许" }, { name: "帕玛森芝士", amount: "1 汤匙" },
    ],
    tools: ["深锅", "平底锅"],
    steps: [
      { text: "水加盐煮沸后下意面，中火煮 8 分钟至仍有嚼劲。", seconds: 480, tip: "比包装建议时间早 1 分钟出锅，入锅还要再炒" },
      { text: "同时冷油下蒜片与干辣椒，小火慢炸至蒜片微金黄，约 4 分钟。", seconds: 240, tip: "蒜片一发黑就苦了，务必小火" },
      { text: "舀一勺煮面水加入蒜油中，晃锅乳化成酱汁。" },
      { text: "面捞入锅中大火翻拌 1 分钟，让面条吸住蒜油。", seconds: 60 },
      { text: "关火撒欧芹、黑胡椒与芝士，拌匀立刻装盘。" },
    ],
    soloTip: "煮面水别全倒掉，留半碗就是天然的酱汁乳化剂。",
    colorTag: "白",
  },
  {
    id: "RC_IT_004", cuisineId: "toscana", name: "猎人烩鸡", nameEn: "Chicken Cacciatora", emoji: "🍗",
    kcal: 560, minutes: 45, difficulty: 3, tasteTags: ["番茄酸", "香草"],
    ingredients: [
      { name: "鸡腿", amount: "2 只" }, { name: "罐装番茄", amount: "200g" },
      { name: "洋葱", amount: "半个" }, { name: "蒜", amount: "2 瓣" },
      { name: "干牛至", amount: "1 茶匙" }, { name: "白葡萄酒", amount: "50ml" },
      { name: "黑橄榄", amount: "5 颗" }, { name: "橄榄油", amount: "2 汤匙" },
    ],
    tools: ["厚底锅", "锅盖"],
    steps: [
      { text: "鸡腿擦干水分，撒盐与黑胡椒，皮朝下中火煎 5 分钟至金黄。", seconds: 300, tip: "擦干水分才能煎出脆皮" },
      { text: "翻面再煎 3 分钟盛出，锅中留底油。", seconds: 180 },
      { text: "下洋葱与蒜炒软，加牛至炒香后倒白葡萄酒煮 1 分钟。", seconds: 60 },
      { text: "倒入罐装番茄与黑橄榄，放回鸡腿，盖盖小火焖 20 分钟。", seconds: 1200 },
      { text: "开盖收汁至浓稠，尝味调整咸淡即完成。" },
    ],
    soloTip: "罐装番茄开封后用不完，分格冷冻，做炖菜随时取用。",
    colorTag: "棕",
  },
  {
    id: "RC_IT_005", cuisineId: "toscana", name: "意式土豆团子", nameEn: "Gnocchi with Sage Butter", emoji: "🥔",
    kcal: 540, minutes: 35, difficulty: 3, tasteTags: ["奶香", "鼠尾草"],
    ingredients: [
      { name: "土豆", amount: "2 个" }, { name: "中筋面粉", amount: "80g" },
      { name: "蛋黄", amount: "1 个" }, { name: "黄油", amount: "25g" },
      { name: "鼠尾草", amount: "6 片" }, { name: "帕玛森芝士", amount: "2 汤匙" },
      { name: "盐", amount: "半茶匙" }, { name: "黑胡椒", amount: "少许" },
    ],
    tools: ["蒸锅", "叉子"],
    steps: [
      { text: "土豆带皮蒸熟 20 分钟，趁热压成泥摊开晾凉。", seconds: 1200, tip: "土豆泥必须晾干，太湿就要多加面粉变硬" },
      { text: "加蛋黄、盐与面粉轻拌成团，切勿过度揉搓。" },
      { text: "搓成长条切小段，用叉子压出纹路。" },
      { text: "水沸下团子，浮起后再煮 30 秒捞出。", seconds: 30 },
      { text: "黄油小火化开加鼠尾草煎香，倒入团子翻匀撒芝士。" },
    ],
    soloTip: "团子一次多搓些平铺冷冻，煮的时候不用解冻直接下锅。",
    colorTag: "黄",
  },
  {
    id: "RC_IT_006", cuisineId: "toscana", name: "提拉米苏（免烤杯装）", nameEn: "Tiramisu Cup", emoji: "🍰",
    kcal: 480, minutes: 30, difficulty: 3, tasteTags: ["咖啡香", "奶香"],
    ingredients: [
      { name: "马斯卡彭", amount: "120g" }, { name: "手指饼干", amount: "6 根" },
      { name: "浓缩咖啡", amount: "80ml" }, { name: "蛋黄", amount: "1 个" },
      { name: "白糖", amount: "25g" }, { name: "淡奶油", amount: "60ml" },
      { name: "可可粉", amount: "1 汤匙" }, { name: "朗姆酒", amount: "1 茶匙" },
    ],
    tools: ["打蛋器", "玻璃杯"],
    steps: [
      { text: "蛋黄加糖隔水加热打至浓稠发白，离火晾凉。" },
      { text: "拌入马斯卡彭与朗姆酒至完全顺滑无颗粒。", seconds: 60, tip: "马斯卡彭提前回温才容易搅匀" },
      { text: "淡奶油打至六分发，翻拌进奶酪糊中。" },
      { text: "手指饼干快速蘸咖啡液，铺入杯底。" },
      { text: "交替铺奶酪糊与饼干，冷藏 2 小时以上，吃前筛可可粉。", seconds: 7200 },
    ],
    soloTip: "一次做两杯，冷藏过夜风味最好，第二天早饭就是甜品。",
    colorTag: "白",
  },

  /* ====== 法国-普罗旺斯 provence（6 道）====== */
  {
    id: "RC_FR_001", cuisineId: "provence", name: "普罗旺斯炖菜", nameEn: "Ratatouille", emoji: "🍆",
    kcal: 340, minutes: 45, difficulty: 2, tasteTags: ["蔬菜甜", "香草"],
    ingredients: [
      { name: "茄子", amount: "1 根" }, { name: "西葫芦", amount: "1 根" },
      { name: "彩椒", amount: "1 个" }, { name: "番茄", amount: "2 个" },
      { name: "洋葱", amount: "半个" }, { name: "蒜", amount: "3 瓣" },
      { name: "百里香", amount: "1 茶匙" }, { name: "橄榄油", amount: "3 汤匙" },
    ],
    tools: ["厚底锅", "锅铲"],
    steps: [
      { text: "茄子、西葫芦切 2cm 块，分别撒盐静置 10 分钟。", seconds: 600 },
      { text: "橄榄油中火分别煎茄子与西葫芦至表面金黄，各 4 分钟。", seconds: 240, tip: "分开煎比一锅乱炖香得多" },
      { text: "余油炒软洋葱与蒜，加彩椒炒 3 分钟。", seconds: 180 },
      { text: "下番茄与百里香，小火煮 10 分钟成酱底。", seconds: 600 },
      { text: "倒回所有蔬菜小火炖 10 分钟，尝味后出锅。", seconds: 600 },
    ],
    soloTip: "这道菜隔夜更好吃，一次做两顿的量冷藏，第二天风味更融。",
    colorTag: "橙",
  },
  {
    id: "RC_FR_002", cuisineId: "provence", name: "尼斯沙拉", nameEn: "Salade Niçoise", emoji: "🥗",
    kcal: 420, minutes: 25, difficulty: 2, tasteTags: ["咸鲜", "橄榄香"],
    ingredients: [
      { name: "金枪鱼罐头", amount: "1 小罐" }, { name: "鸡蛋", amount: "1 个" },
      { name: "小土豆", amount: "3 个" }, { name: "四季豆", amount: "60g" },
      { name: "小番茄", amount: "6 个" }, { name: "黑橄榄", amount: "6 颗" },
      { name: "第戎芥末", amount: "1 茶匙" }, { name: "橄榄油", amount: "2 汤匙" },
    ],
    tools: ["汤锅", "沙拉碗"],
    steps: [
      { text: "土豆煮 15 分钟至可插入，捞出切块。", seconds: 900 },
      { text: "四季豆焯 3 分钟过冰水，保持翠绿脆感。", seconds: 180, tip: "过冰水能锁住颜色" },
      { text: "鸡蛋水开后煮 8 分钟，剥壳切四瓣。", seconds: 480 },
      { text: "芥末、红酒醋与橄榄油搅打成油醋汁。" },
      { text: "所有材料摆盘，淋油醋汁，放上金枪鱼与鸡蛋。" },
    ],
    soloTip: "土豆和鸡蛋可一次多煮几个，冷藏后第二天做沙拉更快。",
    colorTag: "绿",
  },
  {
    id: "RC_FR_003", cuisineId: "provence", name: "香草烤鸡腿", nameEn: "Roast Herbed Chicken Legs", emoji: "🍗",
    kcal: 580, minutes: 50, difficulty: 2, tasteTags: ["香草", "蒜香"],
    ingredients: [
      { name: "鸡腿", amount: "2 只" }, { name: "小土豆", amount: "4 个" },
      { name: "蒜", amount: "5 瓣" }, { name: "迷迭香", amount: "2 枝" },
      { name: "百里香", amount: "3 枝" }, { name: "柠檬", amount: "半个" },
      { name: "橄榄油", amount: "2 汤匙" }, { name: "海盐", amount: "1 茶匙" },
    ],
    tools: ["烤箱", "烤盘"],
    steps: [
      { text: "鸡腿用橄榄油、海盐、香草与蒜瓣抹匀，腌 20 分钟。", seconds: 1200, tip: "香草用手搓一下香气更足" },
      { text: "小土豆对半切开，铺在烤盘底部垫在鸡腿下方。" },
      { text: "烤箱 200℃ 预热，烤 25 分钟。", seconds: 1500 },
      { text: "取出翻面并淋烤盘汤汁，再烤 12 分钟至表皮焦脆。", seconds: 720, tip: "中途淋汁能让表皮更油亮" },
      { text: "出炉挤柠檬汁，静置 5 分钟再切。", seconds: 300 },
    ],
    soloTip: "烤盘底部的土豆吸了鸡油最好吃，可以多放几个当主食。",
    colorTag: "棕",
  },
  {
    id: "RC_FR_004", cuisineId: "provence", name: "简易马赛鱼汤", nameEn: "One-Pot Bouillabaisse", emoji: "🐟",
    kcal: 380, minutes: 40, difficulty: 3, tasteTags: ["海鲜鲜", "藏红花"],
    ingredients: [
      { name: "白身鱼柳", amount: "200g" }, { name: "虾", amount: "4 只" },
      { name: "番茄", amount: "2 个" }, { name: "洋葱", amount: "半个" },
      { name: "藏红花", amount: "一小撮" }, { name: "橙皮", amount: "1 片" },
      { name: "茴香", amount: "半个" }, { name: "橄榄油", amount: "2 汤匙" },
    ],
    tools: ["深锅", "木勺"],
    steps: [
      { text: "洋葱与茴香切丝，橄榄油小火炒软 5 分钟。", seconds: 300 },
      { text: "下番茄炒出汁，加 500ml 水与橙皮煮开。", seconds: 180 },
      { text: "加入藏红花小火煮 10 分钟让汤底上色出香。", seconds: 600, tip: "藏红花泡在温汤里更易出色" },
      { text: "下鱼柳块小火煮 5 分钟。", seconds: 300, tip: "保持微沸不要大火，鱼肉才不散" },
      { text: "最后放虾煮 2 分钟，调盐即可上桌。", seconds: 120 },
    ],
    soloTip: "冻鱼柳比鲜鱼更划算也更稳定，煮汤完全够用。",
    colorTag: "橙",
  },
  {
    id: "RC_FR_005", cuisineId: "provence", name: "普罗旺斯番茄挞", nameEn: "Tomato Tart", emoji: "🥧",
    kcal: 420, minutes: 40, difficulty: 3, tasteTags: ["酥香", "番茄酸"],
    ingredients: [
      { name: "起酥皮", amount: "1 张" }, { name: "樱桃番茄", amount: "8 个" },
      { name: "第戎芥末", amount: "1 汤匙" }, { name: "山羊奶酪", amount: "50g" },
      { name: "百里香", amount: "1 茶匙" }, { name: "橄榄油", amount: "1 汤匙" },
      { name: "黑胡椒", amount: "少许" }, { name: "面粉", amount: "少许" },
    ],
    tools: ["烤箱", "烤盘"],
    steps: [
      { text: "起酥皮从冷藏取出稍回软，叉子在表面扎满小孔。" },
      { text: "皮上均匀抹芥末，边缘留出 1.5cm 不抹。" },
      { text: "摆上切片番茄与奶酪，撒百里香与黑胡椒。" },
      { text: "烤箱 200℃ 烤 18 分钟至边缘金黄膨起。", seconds: 1080, tip: "烤到酥皮分层摊开就到位了" },
      { text: "出炉淋少许橄榄油，静置 5 分钟再切。", seconds: 300 },
    ],
    soloTip: "起酥皮务必冷藏解冻，室温放软会失去层次。",
    colorTag: "红",
  },
  {
    id: "RC_FR_006", cuisineId: "provence", name: "樱桃克拉芙缇", nameEn: "Cherry Clafoutis", emoji: "🍒",
    kcal: 360, minutes: 35, difficulty: 2, tasteTags: ["奶香", "果甜"],
    ingredients: [
      { name: "去核樱桃", amount: "150g" }, { name: "鸡蛋", amount: "2 个" },
      { name: "牛奶", amount: "120ml" }, { name: "中筋面粉", amount: "40g" },
      { name: "白糖", amount: "40g" }, { name: "黄油", amount: "10g" },
      { name: "香草精", amount: "几滴" }, { name: "糖粉", amount: "少许" },
    ],
    tools: ["烤箱", "烤碗"],
    steps: [
      { text: "烤碗内壁涂黄油并撒一层薄糖防粘。" },
      { text: "鸡蛋与糖打匀，加牛奶、面粉与香草精拌成稀面糊。" },
      { text: "樱桃铺满碗底，倒入面糊至八分满。" },
      { text: "烤箱 180℃ 烤 25 分钟至表面金黄凝固。", seconds: 1500, tip: "轻晃烤碗中心不流动即熟" },
      { text: "稍放温后筛糖粉，温热或冷藏吃都可以。" },
    ],
    soloTip: "用冷冻樱桃要先沥干水分，否则面糊会太稀烤不凝。",
    colorTag: "黄",
  },

  /* ====== 墨西哥-瓦哈卡 oaxaca（6 道）====== */
  {
    id: "RC_MX_001", cuisineId: "oaxaca", name: "瓦哈卡莫莱酱鸡", nameEn: "Chicken Mole", emoji: "🍫",
    kcal: 620, minutes: 60, difficulty: 4, tasteTags: ["浓郁", "微苦回甜"],
    ingredients: [
      { name: "鸡腿肉", amount: "200g" }, { name: "莫莱酱", amount: "4 汤匙" },
      { name: "黑巧克力", amount: "10g" }, { name: "番茄", amount: "1 个" },
      { name: "洋葱", amount: "半个" }, { name: "芝麻", amount: "1 汤匙" },
      { name: "孜然粉", amount: "半茶匙" }, { name: "鸡高汤", amount: "200ml" },
    ],
    tools: ["厚底锅", "搅拌机"],
    steps: [
      { text: "鸡腿肉撒盐煎至两面金黄，盛出备用，约 6 分钟。", seconds: 360 },
      { text: "锅中炒软洋葱与番茄，加孜然粉炒香。" },
      { text: "倒入莫莱酱与鸡高汤，用搅拌机打成顺滑酱汁。" },
      { text: "酱汁回锅放鸡腿，小火慢炖 25 分钟。", seconds: 1500, tip: "小火慢炖才能让香料层层释放" },
      { text: "最后加黑巧克力搅至融化，撒芝麻收汁。" },
    ],
    soloTip: "莫莱酱开封后分格冷冻，一次一小块，炖肉非常省事。",
    colorTag: "棕",
  },
  {
    id: "RC_MX_002", cuisineId: "oaxaca", name: "菠萝烤肉塔可", nameEn: "Tacos al Pastor", emoji: "🌮",
    kcal: 560, minutes: 40, difficulty: 3, tasteTags: ["酸甜", "烟熏辣"],
    ingredients: [
      { name: "猪里脊", amount: "200g" }, { name: "菠萝", amount: "3 片" },
      { name: "干辣椒酱", amount: "2 汤匙" }, { name: "橙汁", amount: "3 汤匙" },
      { name: "白醋", amount: "1 汤匙" }, { name: "玉米饼", amount: "4 张" },
      { name: "洋葱", amount: "小半个" }, { name: "香菜", amount: "2 根" },
    ],
    tools: ["平底锅", "平底铸铁锅"],
    steps: [
      { text: "里脊切薄片，用辣椒酱、橙汁、白醋与蒜腌 20 分钟。", seconds: 1200, tip: "橙汁的果酸能软化肉质" },
      { text: "菠萝片煎至边缘焦糖化，切小块备用，约 3 分钟。", seconds: 180 },
      { text: "大火快煎肉片，每面 1 分钟至边缘微焦。", seconds: 120, tip: "分批下锅，避免出水变成煮肉" },
      { text: "玉米饼在干锅上两面各烘 20 秒至柔软。", seconds: 20 },
      { text: "饼中放肉片、菠萝、洋葱碎与香菜，挤青柠食用。" },
    ],
    soloTip: "腌好的肉片可冷藏两天，随吃随煎，很适合一人食节奏。",
    colorTag: "橙",
  },
  {
    id: "RC_MX_003", cuisineId: "oaxaca", name: "牛油果酱配玉米片", nameEn: "Guacamole & Totopos", emoji: "🥑",
    kcal: 380, minutes: 10, difficulty: 1, tasteTags: ["清爽", "微酸"],
    ingredients: [
      { name: "熟牛油果", amount: "1 个" }, { name: "小番茄", amount: "3 个" },
      { name: "红洋葱", amount: "1/4 个" }, { name: "青柠", amount: "半个" },
      { name: "香菜", amount: "2 根" }, { name: "玉米片", amount: "1 小把" },
      { name: "海盐", amount: "半茶匙" }, { name: "烟熏辣椒粉", amount: "少许" },
    ],
    tools: ["叉子", "碗"],
    steps: [
      { text: "牛油果对半去核，用勺子挖出果肉放入碗中。" },
      { text: "挤入青柠汁后立刻用叉子压碎，保留一些颗粒感。", tip: "先加青柠汁能防止氧化变黑" },
      { text: "拌入番茄丁、洋葱碎与香菜，加海盐调味。" },
      { text: "撒少许辣椒粉，尝味后按需补青柠汁。" },
      { text: "配玉米片立刻食用，或盖保鲜膜贴面冷藏。" },
    ],
    soloTip: "半个牛油果带核抹青柠汁包好冷藏，第二天仍然新鲜。",
    colorTag: "绿",
  },
  {
    id: "RC_MX_004", cuisineId: "oaxaca", name: "鸡丝玉米浓汤", nameEn: "Sopa de Elote con Pollo", emoji: "🍲",
    kcal: 420, minutes: 25, difficulty: 2, tasteTags: ["玉米甜", "奶香"],
    ingredients: [
      { name: "甜玉米粒", amount: "150g" }, { name: "鸡胸肉", amount: "100g" },
      { name: "洋葱", amount: "小半个" }, { name: "牛奶", amount: "150ml" },
      { name: "鸡高汤", amount: "200ml" }, { name: "黄油", amount: "10g" },
      { name: "烟熏辣椒粉", amount: "半茶匙" }, { name: "香菜", amount: "1 根" },
    ],
    tools: ["汤锅", "搅拌机"],
    steps: [
      { text: "鸡胸冷水下锅煮 12 分钟，捞出撕成丝，汤留用。", seconds: 720, tip: "煮鸡的汤别倒，直接当高汤" },
      { text: "黄油炒香洋葱碎至透明，约 3 分钟。", seconds: 180 },
      { text: "下一半玉米粒炒 2 分钟，倒入高汤煮 8 分钟。", seconds: 480 },
      { text: "用搅拌机打成浓汤后回锅，加剩余玉米粒与牛奶煮 3 分钟。", seconds: 180 },
      { text: "放鸡丝煮 2 分钟，调盐撒辣椒粉与香菜。", seconds: 120 },
    ],
    soloTip: "冷冻玉米粒比罐头更甜，随时抓一把就能煮汤。",
    colorTag: "黄",
  },
  {
    id: "RC_MX_005", cuisineId: "oaxaca", name: "瓦哈卡脆饼", nameEn: "Tlayuda", emoji: "🫓",
    kcal: 520, minutes: 30, difficulty: 2, tasteTags: ["酥脆", "豆香"],
    ingredients: [
      { name: "大玉米饼", amount: "1 张" }, { name: "黑豆泥", amount: "100g" },
      { name: "瓦哈卡奶酪", amount: "60g" }, { name: "牛肉末", amount: "80g" },
      { name: "牛油果", amount: "半个" }, { name: "生菜丝", amount: "1 把" },
      { name: "番茄", amount: "1 个" }, { name: "辣椒酱", amount: "1 茶匙" },
    ],
    tools: ["平底锅", "抹刀"],
    steps: [
      { text: "牛肉末加盐炒散至干香，约 4 分钟盛出。", seconds: 240 },
      { text: "玉米饼干锅中火烘 2 分钟至变硬挺。", seconds: 120, tip: "烘到能立起来才够脆" },
      { text: "抹上黑豆泥，铺奶酪与牛肉末。" },
      { text: "盖盖小火烙 4 分钟至奶酪融化。", seconds: 240 },
      { text: "放牛油果片、生菜丝与番茄，淋辣椒酱对折食用。" },
    ],
    soloTip: "玉米饼受潮变软时，干锅复烘 1 分钟就能恢复脆度。",
    colorTag: "棕",
  },
  {
    id: "RC_MX_006", cuisineId: "oaxaca", name: "墨西哥炒蛋", nameEn: "Huevos Rancheros", emoji: "🥚",
    kcal: 420, minutes: 15, difficulty: 1, tasteTags: ["微辣", "番茄酸"],
    ingredients: [
      { name: "鸡蛋", amount: "2 个" }, { name: "番茄", amount: "2 个" },
      { name: "洋葱", amount: "小半个" }, { name: "小米辣", amount: "1 个" },
      { name: "玉米饼", amount: "2 张" }, { name: "黑豆", amount: "3 汤匙" },
      { name: "香菜", amount: "1 根" }, { name: "食用油", amount: "1 汤匙" },
    ],
    tools: ["平底锅", "锅铲"],
    steps: [
      { text: "番茄、洋葱与辣椒切碎，中火炒成粗粒莎莎酱，约 4 分钟。", seconds: 240, tip: "炒到番茄出汁但仍有颗粒感" },
      { text: "加黑豆压碎拌匀，调盐盛出一半备用。" },
      { text: "锅中打入鸡蛋，小火煎至蛋白凝固蛋黄半熟。", seconds: 180 },
      { text: "玉米饼干锅两面各烘 20 秒至柔软。", seconds: 20 },
      { text: "饼上铺豆酱、煎蛋，浇莎莎酱撒香菜。" },
    ],
    soloTip: "莎莎酱一次炒双份，冷藏三天，配蛋配饼都很方便。",
    colorTag: "红",
  },

  /* ====== 希腊-克里特 crete（4 道，<6 触发并池）====== */
  {
    id: "RC_GR_001", cuisineId: "crete", name: "希腊沙拉", nameEn: "Greek Salad", emoji: "🥗",
    kcal: 320, minutes: 10, difficulty: 1, tasteTags: ["咸鲜", "清爽"],
    ingredients: [
      { name: "番茄", amount: "2 个" }, { name: "黄瓜", amount: "半根" },
      { name: "红洋葱", amount: "1/4 个" }, { name: "菲达奶酪", amount: "50g" },
      { name: "卡拉马塔橄榄", amount: "6 颗" }, { name: "特级初榨橄榄油", amount: "1 汤匙" },
      { name: "干牛至", amount: "半茶匙" }, { name: "红酒醋", amount: "1 茶匙" },
    ],
    tools: ["沙拉碗", "厨刀"],
    steps: [
      { text: "番茄切大块，黄瓜拍裂后切厚片，保持粗犷口感。" },
      { text: "红洋葱切薄圈，用冰水泡 5 分钟去辛辣。", seconds: 300 },
      { text: "所有蔬菜与橄榄放入碗中，加橄榄油与红酒醋翻拌。" },
      { text: "整块菲达奶酪置于顶部，不要切碎。" },
      { text: "撒干牛至与黑胡椒，上桌前再拌一次。" },
    ],
    soloTip: "菲达奶酪一次用不完，泡在盐水中冷藏能保存更久。",
    colorTag: "绿",
  },
  {
    id: "RC_GR_002", cuisineId: "crete", name: "穆萨卡", nameEn: "Moussaka", emoji: "🍆",
    kcal: 620, minutes: 60, difficulty: 4, tasteTags: ["浓郁", "奶香"],
    ingredients: [
      { name: "茄子", amount: "1 根" }, { name: "羊肉末", amount: "150g" },
      { name: "番茄", amount: "1 个" }, { name: "洋葱", amount: "半个" },
      { name: "牛奶", amount: "150ml" }, { name: "面粉", amount: "15g" },
      { name: "黄油", amount: "15g" }, { name: "肉桂粉", amount: "1/4 茶匙" },
    ],
    tools: ["烤箱", "烤盘"],
    steps: [
      { text: "茄子切 1cm 厚片，撒盐静置 15 分钟吸去水分。", seconds: 900, tip: "吸干水分的茄子才不会烤出一盘油" },
      { text: "茄子两面刷油，200℃ 烤 15 分钟至微焦。", seconds: 900 },
      { text: "炒香洋葱与羊肉末，加番茄、肉桂粉炖 10 分钟。", seconds: 600 },
      { text: "黄油炒面粉后加牛奶煮成白酱，调盐与肉豆蔻。" },
      { text: "烤盘依次铺茄子、肉酱、茄子、白酱，180℃ 烤 25 分钟。", seconds: 1500, tip: "烤到表面金黄起泡才算到位" },
    ],
    soloTip: "穆萨卡冷藏后切块更整齐，做成便当第二天更入味。",
    colorTag: "棕",
  },
  {
    id: "RC_GR_003", cuisineId: "crete", name: "达科斯面包沙拉", nameEn: "Dakos", emoji: "🍅",
    kcal: 340, minutes: 10, difficulty: 1, tasteTags: ["麦香", "咸鲜"],
    ingredients: [
      { name: "大麦脆饼", amount: "1 片" }, { name: "番茄", amount: "2 个" },
      { name: "菲达奶酪", amount: "40g" }, { name: "橄榄油", amount: "1 汤匙" },
      { name: "干牛至", amount: "半茶匙" }, { name: "黑橄榄", amount: "4 颗" },
      { name: "海盐", amount: "少许" }, { name: "黑胡椒", amount: "少许" },
    ],
    tools: ["碗", "刨丝器"],
    steps: [
      { text: "番茄用刨丝器刨成粗泥，留下果皮弃用。" },
      { text: "番茄泥加海盐与橄榄油拌匀，静置 2 分钟。", seconds: 120 },
      { text: "脆饼快速沾水 3 秒后铺在盘上，避免过湿。", seconds: 3, tip: "沾水只是让它回软一点，别泡" },
      { text: "把番茄泥铺满脆饼，撒干牛至。" },
      { text: "刨上菲达奶酪碎，放黑橄榄与黑胡椒即可。" },
    ],
    soloTip: "大麦脆饼热量低又耐存，囤一包随时能做这道快手沙拉。",
    colorTag: "红",
  },
  {
    id: "RC_GR_004", cuisineId: "crete", name: "蜂蜜酸奶配核桃", nameEn: "Yogurt with Honey & Walnuts", emoji: "🍯",
    kcal: 300, minutes: 5, difficulty: 1, tasteTags: ["甜润", "坚果香"],
    ingredients: [
      { name: "希腊酸奶", amount: "150g" }, { name: "核桃仁", amount: "20g" },
      { name: "蜂蜜", amount: "1 汤匙" }, { name: "肉桂粉", amount: "少许" },
      { name: "葡萄干", amount: "1 茶匙" }, { name: "柠檬皮屑", amount: "少许" },
    ],
    tools: ["小碗", "干锅"],
    steps: [
      { text: "核桃仁干锅小火烘 2 分钟至香气溢出。", seconds: 120, tip: "烘过的核桃香味提升非常大" },
      { text: "取出稍凉后用手掰成粗粒。" },
      { text: "酸奶盛入碗中，用勺背抹出旋涡造型。" },
      { text: "淋蜂蜜，撒核桃、葡萄干与肉桂粉。" },
      { text: "最后擦少许柠檬皮屑提香，立即食用。" },
    ],
    soloTip: "核桃一次烘一小批装罐，早餐或夜宵随手抓一把都用得上。",
    colorTag: "白",
  },

  /* ====== 秘鲁-利马 lima（4 道，<6 触发并池）====== */
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
  {
    id: "RC_PE_002", cuisineId: "lima", name: "利马土豆塔", nameEn: "Causa Limeña", emoji: "🥔",
    kcal: 380, minutes: 35, difficulty: 3, tasteTags: ["酸香", "绵密"],
    ingredients: [
      { name: "黄心土豆", amount: "300g" }, { name: "黄辣椒酱", amount: "2 汤匙" },
      { name: "青柠", amount: "2 个" }, { name: "鸡胸肉", amount: "100g" },
      { name: "蛋黄酱", amount: "2 汤匙" }, { name: "牛油果", amount: "半个" },
      { name: "盐", amount: "1 茶匙" }, { name: "橄榄油", amount: "1 汤匙" },
    ],
    tools: ["蒸锅", "压泥器"],
    steps: [
      { text: "土豆连皮蒸 20 分钟至软，趁热去皮压成细腻薯泥。", seconds: 1200 },
      { text: "薯泥趁热拌入黄辣椒酱、青柠汁、橄榄油与盐，搅至顺滑。" },
      { text: "鸡胸煮熟撕成丝，拌蛋黄酱与少许青柠汁。" },
      { text: "模具中先压一层薯泥，再放鸡丝与牛油果片，最上再压薯泥。" },
      { text: "冷藏定型 15 分钟后脱模，配生菜食用。", seconds: 900, tip: "冷藏定型后切面才整齐好看" },
    ],
    soloTip: "薯泥越细腻口感越好，用压泥器比叉子省力得多。",
    colorTag: "黄",
  },
  {
    id: "RC_PE_003", cuisineId: "lima", name: "秘鲁炒牛肉", nameEn: "Lomo Saltado", emoji: "🥩",
    kcal: 640, minutes: 25, difficulty: 2, tasteTags: ["锅气", "咸酸"],
    ingredients: [
      { name: "牛里脊", amount: "200g" }, { name: "红洋葱", amount: "半个" },
      { name: "番茄", amount: "1 个" }, { name: "薯条", amount: "1 小把" },
      { name: "生抽", amount: "2 汤匙" }, { name: "红酒醋", amount: "1 汤匙" },
      { name: "香菜", amount: "2 根" }, { name: "米饭", amount: "1 碗" },
    ],
    tools: ["炒锅", "锅铲"],
    steps: [
      { text: "牛里脊切 1cm 粗条，加生抽与黑胡椒腌 10 分钟。", seconds: 600 },
      { text: "锅烧到冒烟，下牛肉条大火快炒 90 秒上色盛出。", seconds: 90, tip: "锅必须够热，牛肉才不会出水" },
      { text: "下洋葱与番茄大火炒 1 分钟保持脆感。", seconds: 60 },
      { text: "倒回牛肉，加生抽与红酒醋炝锅翻匀。" },
      { text: "关火拌入薯条与香菜，配米饭上桌。" },
    ],
    soloTip: "薯条用冷冻款直接炸或空气炸，比现切省一半时间。",
    colorTag: "棕",
  },
  {
    id: "RC_PE_004", cuisineId: "lima", name: "秘鲁鸡肉饭", nameEn: "Arroz con Pollo", emoji: "🍗",
    kcal: 580, minutes: 40, difficulty: 3, tasteTags: ["香草", "米饭油润"],
    ingredients: [
      { name: "鸡腿肉", amount: "150g" }, { name: "长粒米", amount: "100g" },
      { name: "香菜", amount: "1 把" }, { name: "菠菜", amount: "50g" },
      { name: "洋葱", amount: "半个" }, { name: "蒜", amount: "2 瓣" },
      { name: "鸡高汤", amount: "250ml" }, { name: "青豆", amount: "3 汤匙" },
    ],
    tools: ["搅拌机", "厚底锅"],
    steps: [
      { text: "香菜、菠菜与蒜加少量水打成绿色酱汁。" },
      { text: "鸡腿肉切块撒盐煎至金黄，盛出备用，约 5 分钟。", seconds: 300 },
      { text: "锅中炒软洋葱，加米翻炒 1 分钟让米粒裹油。", seconds: 60, tip: "先炒米再加水，饭粒才分明" },
      { text: "倒入绿酱与高汤煮开，放回鸡块转小火焖 18 分钟。", seconds: 1080 },
      { text: "撒青豆再焖 3 分钟，关火静置 5 分钟后翻松。", seconds: 180 },
    ],
    soloTip: "绿酱可提前打好冷冻，做的时候直接下锅，风味不变。",
    colorTag: "橙",
  },
];

export const RECIPE_SEEDS: RecipeSeed[] = [...ORIGINAL_RECIPE_SEEDS, ...(communityRecipes as RecipeSeed[]), ...(worldRecipes as RecipeSeed[])];

export function seedRecipes(db: DB): void {
  const stmt = db.prepare(
    `INSERT INTO recipes
      (id, cuisine_id, name, name_en, emoji, image_path, kcal, minutes, difficulty,
       taste_tags, ingredients, tools, steps, solo_tip, color_tag, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       cuisine_id=excluded.cuisine_id, name=excluded.name, name_en=excluded.name_en,
       image_path=excluded.image_path, kcal=excluded.kcal, minutes=excluded.minutes,
       difficulty=excluded.difficulty, taste_tags=excluded.taste_tags,
       ingredients=excluded.ingredients, tools=excluded.tools, steps=excluded.steps,
       solo_tip=excluded.solo_tip, color_tag=excluded.color_tag, metadata=excluded.metadata`
  );
  for (const r of RECIPE_SEEDS) {
    const photo = (photoSources as Record<string, { imagePath: string; sourceUrl: string }>)[r.id];
    stmt.run(
      r.id, r.cuisineId, r.name, r.nameEn, r.emoji, photo?.imagePath ?? r.imagePath ?? null,
      r.kcal, r.minutes, r.difficulty,
      JSON.stringify(r.tasteTags), JSON.stringify(r.ingredients),
      JSON.stringify(r.tools), JSON.stringify(r.steps), r.soloTip, r.colorTag,
      JSON.stringify({ source_url: r.sourceUrl ?? photo?.sourceUrl,
        source_name: r.sourceName ?? (photo ? "照片：HowToCook 社区" : undefined),
        source_note: r.sourceNote, servings_note: r.servingsNote,
        original_instructions: r.originalInstructions, original_source_url: r.originalSourceUrl,
        image_credit: r.imageCredit ?? (photo ? "HowToCook contributors · Unlicense" : undefined) })
    );
  }
}
