import confetti from "canvas-confetti";

/** 打卡成功时的全屏轻量粒子动效（PRD §4.4.1）。 */
export function fireConfetti(): void {
  confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
}
