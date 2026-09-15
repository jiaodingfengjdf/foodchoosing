import { apiForm } from "./api";

const KEY = "wte_pending_checkins";

export interface PendingCheckin {
  recipe_id: string;
  rating: number;
  review?: string;
  photoDataUrl?: string;
}

interface Queued extends PendingCheckin {
  id: string;
}

function read(): Queued[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Queued[];
  } catch {
    return [];
  }
}

function write(items: Queued[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueCheckin(op: PendingCheckin): void {
  const items = read();
  items.push({ ...op, id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  write(items);
}

export function pendingCheckins(): Queued[] {
  return read();
}

export function removeCheckin(id: string): void {
  write(read().filter((i) => i.id !== id));
}

/** 恢复网络后重放队列；任一条失败即中止，保留剩余待下次。 */
export async function replayCheckins(): Promise<void> {
  for (const item of read()) {
    const form = new FormData();
    form.append("recipe_id", item.recipe_id);
    form.append("rating", String(item.rating));
    if (item.review) form.append("review", item.review);
    if (item.photoDataUrl) {
      const blob = await (await fetch(item.photoDataUrl)).blob();
      form.append("photo", blob, "dish.jpg");
    }
    try {
      await apiForm("/api/checkins", form);
      removeCheckin(item.id);
    } catch {
      return;
    }
  }
}
