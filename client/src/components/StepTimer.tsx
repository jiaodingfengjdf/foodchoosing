import { useEffect, useState } from "react";
import { vibrate } from "../lib/sound";

export function StepTimer({ seconds, label, onClose }: {
  seconds: number;
  label: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(seconds);
  const finished = left <= 0;

  useEffect(() => {
    if (finished) {
      vibrate([200, 100, 200]);
      return;
    }
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [finished]);

  const mm = String(Math.floor(Math.max(left, 0) / 60)).padStart(2, "0");
  const ss = String(Math.max(left, 0) % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-x-0 bottom-14 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-4 text-white shadow-2xl"
      data-testid="step-timer"
    >
      <div className="text-3xl font-bold tabular-nums" data-testid="timer-display">
        {mm}:{ss}
      </div>
      <div className="flex-1 text-sm">
        <div className="opacity-70">{label}</div>
        {finished && <div className="font-medium text-amber-400">时间到</div>}
      </div>
      <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">
        取消
      </button>
    </div>
  );
}
