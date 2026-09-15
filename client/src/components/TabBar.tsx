import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "转盘", emoji: "🎡" },
  { to: "/atlas", label: "图鉴", emoji: "🗺️" },
  { to: "/favorites", label: "收藏", emoji: "❤️" },
  { to: "/profile", label: "我的", emoji: "👤" },
];

export function TabBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-14 max-w-md border-t border-neutral-200 bg-white"
      data-testid="tabbar"
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.to === "/"}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] ${
              isActive ? "text-brand-500" : "text-neutral-400"
            }`
          }
        >
          <span className="text-lg leading-none">{t.emoji}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
