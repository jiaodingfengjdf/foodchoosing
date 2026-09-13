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
