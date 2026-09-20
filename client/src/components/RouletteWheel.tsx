import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RecipeDTO } from "../api/types";
import { playTick } from "../lib/sound";

const COLORS = ["#fff0df", "#e8eee4", "#fce3d7", "#e9e5f2", "#f9edc9", "#dcebec", "#f4dfe5", "#e8edce"];
export const SPIN_MS = 2500;
export function nextWheelRotation(current: number, index: number, count: number) {
  const target = -(index + 0.5) * (360 / count);
  return current + 1800 + ((target - (current % 360)) % 360 + 360) % 360;
}
const point = (radius: number, angle: number) => ({ x: 170 + radius * Math.sin(angle * Math.PI / 180), y: 170 - radius * Math.cos(angle * Math.PI / 180) });

export function RouletteWheel({ candidates, spinning, resultId, onSpinEnd, onGo, loading = false }: {
  candidates: RecipeDTO[]; spinning: boolean; resultId: string | null;
  onSpinEnd: () => void; onGo?: () => void; loading?: boolean;
}) {
  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const endRef = useRef(onSpinEnd);
  endRef.current = onSpinEnd;
  const count = candidates.length;
  const index = candidates.findIndex((item) => item.id === resultId);
  useEffect(() => {
    if (!spinning || index < 0 || !count) return;
    const next = nextWheelRotation(rotationRef.current, index, count);
    rotationRef.current = next;
    setRotation(next);
    const ticks = Array.from({ length: 8 }, (_, i) => window.setTimeout(playTick, 100 + i * i * 35));
    const finish = window.setTimeout(() => endRef.current(), SPIN_MS);
    return () => { ticks.forEach(clearTimeout); clearTimeout(finish); };
  }, [spinning, index, count, resultId]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]" data-testid="roulette-wheel">
      <div className="absolute -top-1 left-0 right-0 z-20 flex justify-center" aria-hidden="true">
        <div className="h-0 w-0 border-x-[12px] border-t-[26px] border-x-transparent border-t-[#65452f] drop-shadow" />
      </div>
      <motion.svg viewBox="0 0 340 340" className="h-full w-full rounded-full border-[6px] border-white shadow-xl"
        animate={{ rotate: rotation }} initial={false}
        transition={{ duration: SPIN_MS / 1000, ease: [0.15, 0.85, 0.25, 1] }}
        data-testid="wheel-sectors" data-rotation={rotation}>
        <circle cx="170" cy="170" r="170" fill="#f3eadf" />
        {candidates.map((recipe, i) => {
          const a = i * 360 / count, b = (i + 1) * 360 / count;
          const start = point(168, a), end = point(168, b), label = point(112, (a + b) / 2);
          const name = Array.from(recipe.name);
          const lines = Array.from({ length: Math.ceil(name.length / 6) }, (_, line) => name.slice(line * 6, line * 6 + 6).join(""));
          return <g key={recipe.id} data-testid="wheel-sector">
            {count === 1 ? <circle cx="170" cy="170" r="168" fill={COLORS[0]} /> :
              <path d={`M170 170 L${start.x} ${start.y} A168 168 0 ${count < 2 ? 1 : 0} 1 ${end.x} ${end.y} Z`} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth="2" />}
            <text x={label.x} y={label.y - 9} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="#493527"
              transform={`rotate(${(a + b) / 2}, ${label.x}, ${label.y})`}>
              {lines.map((line, j) => <tspan key={j} x={label.x} dy={j ? 17 : 0}>{line}</tspan>)}
              <tspan x={label.x} dy="18" fontSize="10" fontWeight="400" fill="#806957">约{recipe.minutes}分钟</tspan>
            </text>
          </g>;
        })}
        {!count && <text x="170" y="70" textAnchor="middle" fontSize="14" fill="#8b735f">{loading ? "正在准备菜单…" : "点击中心，挑选今天的菜"}</text>}
      </motion.svg>
      {/* 居中由静态容器负责，按压动画只缩放按钮，不覆盖 translate。 */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <motion.button whileTap={{ scale: 0.94 }} disabled={spinning || loading} onClick={onGo}
          aria-label="今天吃它" data-testid="wheel-go"
          className="pointer-events-auto flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full border-4 border-white bg-[#bd5d37] text-sm font-bold text-white shadow-lg disabled:opacity-80">
          {loading ? "选菜中…" : spinning ? "转动中…" : <><span>今天</span><span>吃它</span></>}
        </motion.button>
      </div>
    </div>
  );
}
