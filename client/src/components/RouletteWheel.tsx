import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RecipeDTO } from "../api/types";
import { playTick, vibrate } from "../lib/sound";

const SECTOR_COLORS = ["#ffe8d6", "#fff3c4", "#d8f3dc", "#dbe7ff", "#ffd6e0", "#e8dbff"];
const SPIN_MS = 2500;
const EXTRA_TURNS = 5;

export function RouletteWheel({ candidates, spinning, resultId, onSpinEnd, onGo }: {
  candidates: RecipeDTO[];
  spinning: boolean;
  resultId: string | null;
  onSpinEnd: () => void;
  onGo?: () => void;
}) {
  const n = candidates.length;
  const sector = n > 0 ? 360 / n : 360;
  const [rotation, setRotation] = useState(0);
  const timers = useRef<number[]>([]);
  const rotationRef = useRef(0);

  const targetIndex = resultId ? candidates.findIndex((c) => c.id === resultId) : -1;

  useEffect(() => {
    if (!spinning || targetIndex < 0) return;

    // 指针在正上方：把目标扇区中心转到 0°；多转 EXTRA_TURNS 圈制造转动感
    const current = rotationRef.current % 360;
    const desired = -(targetIndex * sector + sector / 2);
    const delta = ((desired - current) % 360 + 360) % 360;
    const next = rotationRef.current + 360 * EXTRA_TURNS + delta;
    rotationRef.current = next;
    setRotation(next);

    // 减速咔哒：间隔递增，模拟指针逐渐慢下来
    let delay = 120;
    for (let i = 0; i < 10; i++) {
      delay += 90 + i * 40;
      timers.current.push(
        window.setTimeout(() => {
          playTick();
          vibrate(15);
        }, delay)
      );
    }
    timers.current.push(window.setTimeout(onSpinEnd, SPIN_MS));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // onSpinEnd 每次渲染都是新引用，纳入依赖会导致动画反复重启，故刻意排除
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, resultId, targetIndex, sector]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]" data-testid="roulette-wheel">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-2xl">🔻</div>

      <motion.div
        className="h-full w-full rounded-full border-8 border-white shadow-lg"
        style={{
          background:
            n > 0
              ? `conic-gradient(${candidates
                  .map(
                    (_, i) =>
                      `${SECTOR_COLORS[i % SECTOR_COLORS.length]} ${(i * sector).toFixed(2)}deg ${(
                        (i + 1) * sector
                      ).toFixed(2)}deg`
                  )
                  .join(", ")})`
              : "#f5f5f5",
        }}
        animate={{ rotate: rotation }}
        transition={{ duration: SPIN_MS / 1000, ease: [0.15, 0.85, 0.25, 1] }}
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
        onClick={onGo}
        aria-label="今天吃它"
        className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white shadow-xl disabled:opacity-60"
        data-testid="wheel-go"
      >
        今天
        <br />
        吃它
      </motion.button>
    </div>
  );
}
