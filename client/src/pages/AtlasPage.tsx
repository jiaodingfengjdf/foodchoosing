import { useState } from "react";
import { Link } from "react-router-dom";
import { useBadges, useCatalog, useCuisineTree, useFavoriteToggle } from "../api/hooks";
import { BadgeCard } from "../components/BadgeCard";
import { DishPhoto } from "../components/DishPhoto";
import type { CatalogResponse } from "../api/types";

function RecipeCard({ recipe }: { recipe: CatalogResponse["items"][number] }) {
  const favorite = useFavoriteToggle(recipe.id);
  return <article className="overflow-hidden rounded-2xl border border-[#eadfd2] bg-white shadow-sm" data-testid="recipe-card">
    <Link to={`/recipe/${recipe.id}`} className="relative block">
      <DishPhoto src={recipe.image_path} name={recipe.name} className="aspect-[4/3] w-full" />
      {recipe.is_cooked && <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] text-emerald-800">✓ 已做过</span>}
    </Link>
    <div className="p-3">
      <div className="flex items-start justify-between gap-1">
        <Link to={`/recipe/${recipe.id}`} className="text-sm font-bold leading-5 text-[#493527]">{recipe.name}</Link>
        <button disabled={favorite.isPending} onClick={() => favorite.mutate(!recipe.is_favorite)} aria-label={`${recipe.is_favorite ? "取消收藏" : "收藏"}${recipe.name}`} className="shrink-0 text-xl leading-5 text-[#bd5d37]">{recipe.is_favorite ? "♥" : "♡"}</button>
      </div>
      <p className="mt-1 truncate text-[11px] text-neutral-500">{recipe.cuisine_path.split(" > ").slice(-1)[0]}</p>
      <div className="mt-2 flex justify-between text-[11px] text-[#947760]"><span>约 {recipe.minutes} 分钟</span><span>{recipe.difficulty <= 2 ? "新手友好" : recipe.difficulty <= 3 ? "家常难度" : "进阶料理"}</span></div>
      {favorite.isError && <p className="mt-1 text-xs text-red-600">收藏失败，请重试</p>}
    </div>
  </article>;
}
export function AtlasPage() {
  const [tab, setTab] = useState<"recipes" | "badges">("recipes");
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [continent, setContinent] = useState("");
  const [minutes, setMinutes] = useState("");
  const [status, setStatus] = useState("all");
  const [photos, setPhotos] = useState(false);
  const [page, setPage] = useState(1);
  const tree = useCuisineTree();
  const catalog = useCatalog({ q: search, cuisine: cuisine || continent, max_minutes: minutes, status, photos, page, limit: 24 });
  const badges = useBadges();
  const data = catalog.data;
  const update = (action: () => void) => { action(); setPage(1); };
  const nodes = tree.data?.nodes ?? [];
  const continentOrder = ["asia", "europe", "north-america", "south-america", "africa", "oceania"];
  const continents = nodes.filter(n => n.level === 1 && n.dish_count > 0)
    .sort((a, b) => continentOrder.indexOf(a.id) - continentOrder.indexOf(b.id));
  const regions = new Set(nodes.filter(n => n.parent_id === continent).map(n => n.id));
  const countries = nodes.filter(n => n.level === 3 && n.dish_count > 0 && (!continent || regions.has(n.parent_id ?? "")));
  return <div className="p-4">
    <header className="mb-5 mt-2">
      <p className="text-xs tracking-[0.2em] text-[#98775e]">从一餐，认识一个地方</p>
      <h1 className="mt-2 text-3xl font-bold text-[#493527]">风味图鉴</h1>
      <p className="mt-2 text-sm text-neutral-500">{data ? `${data.catalog_total} 道菜谱 · ${data.photo_count} 张实拍 · ${data.cuisine_count} 种风味` : "寻找下一道想做的菜"}</p>
    </header>
    <div className="mb-4 flex gap-5 border-b border-[#e3d5c4] text-sm">
      {([['recipes', '菜谱图鉴'], ['badges', '我的成就']] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`pb-3 ${tab === key ? 'border-b-2 border-[#bd5d37] font-bold text-[#bd5d37]' : 'text-neutral-400'}`}>{label}</button>)}
    </div>
    {tab === "recipes" ? <>
      <div role="group" aria-label="按洲浏览" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[{ id: "", name: "全球", dish_count: data?.catalog_total ?? 0 }, ...continents].map(n => <button key={n.id} aria-pressed={continent === n.id} onClick={() => update(() => { setContinent(n.id); setCuisine(""); })} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs ${!n.id ? 'col-span-2 sm:col-span-3' : ''} ${continent === n.id ? 'border-[#65452f] bg-[#65452f] text-white' : 'border-[#eadfd2] bg-white text-[#65452f]'}`}><span>{n.name}</span><span className="opacity-70">{n.dish_count} 道</span></button>)}
      </div>
      <input value={search} onChange={(e) => update(() => setSearch(e.target.value))} aria-label="搜索菜名或食材" placeholder="搜索菜名或食材，例如：土豆、牛肉" className="mb-3 w-full rounded-xl border border-[#e3d5c4] bg-white p-3 text-sm outline-none focus:border-[#bd5d37]" />
      <div className="grid grid-cols-2 gap-2">
        <select value={cuisine} onChange={(e) => update(() => setCuisine(e.target.value))} aria-label="地区与菜系" className="min-w-0 rounded-xl bg-white p-2.5 text-xs">
          <option value="">{continent ? '本洲全部国家与菜系' : '全部地区与菜系'}</option>
          {countries.map(country => <optgroup key={country.id} label={country.name}>
            <option value={country.id}>{country.name} · 全部（{country.dish_count}）</option>
            {nodes.filter(n => n.parent_id === country.id && n.dish_count > 0).map(n => <option key={n.id} value={n.id}>{n.name}（{n.dish_count}）</option>)}
          </optgroup>)}
        </select>
        <select value={minutes} onChange={(e) => update(() => setMinutes(e.target.value))} aria-label="制作时间" className="rounded-xl bg-white p-2.5 text-xs"><option value="">不限制作时间</option><option value="15">15 分钟以内</option><option value="30">30 分钟以内</option><option value="60">1 小时以内</option></select>
      </div>
      <div className="my-3 flex flex-wrap items-center gap-2">
        {[['all','全部'],['uncooked','没做过'],['cooked','已做过'],['favorites','已收藏']].map(([key,label]) => <button key={key} onClick={() => update(() => setStatus(key))} className={`rounded-full px-3 py-1.5 text-xs ${status === key ? 'bg-[#65452f] text-white' : 'bg-white text-neutral-500'}`}>{label}</button>)}
        <label className="ml-auto flex items-center gap-1 text-xs text-neutral-500"><input type="checkbox" checked={photos} onChange={e => update(() => setPhotos(e.target.checked))} />有实拍</label>
      </div>
      <p className="mb-3 text-xs text-neutral-400">{data ? `找到 ${data.total} 道菜` : '正在加载菜谱…'}</p>
      {catalog.isError && <div role="alert" className="rounded-xl bg-white p-5 text-sm">菜谱暂时加载失败。<button onClick={() => catalog.refetch()} className="ml-2 text-brand-500">重试</button></div>}
      <div className="grid grid-cols-2 gap-3">{data?.items.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
      {data?.items.length === 0 && <p className="py-12 text-center text-sm text-neutral-400">暂时没有符合条件的菜，换个筛选试试。</p>}
      {data && data.total > 24 && <div className="my-6 flex items-center justify-center gap-5 text-sm"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg bg-white p-2 disabled:opacity-30">上一页</button><span>{page} / {Math.ceil(data.total / 24)}</span><button disabled={page * 24 >= data.total} onClick={() => setPage(page + 1)} className="rounded-lg bg-white p-2 disabled:opacity-30">下一页</button></div>}
      <p className="mt-5 text-[11px] leading-5 text-neutral-400">实拍与社区配方来自 HowToCook、TheMealDB 及其贡献者；每道菜详情可查看出处、原文与配方份量。尚未补图的菜会明确标注。</p>
    </> : <><p className="mb-4 text-sm text-neutral-500">做一道、记一餐，慢慢点亮你的风味地图。</p><div className="grid grid-cols-3 gap-3">{badges.data?.badges.map(b => <BadgeCard key={b.id} badge={b} />)}</div></>}
  </div>;
}
