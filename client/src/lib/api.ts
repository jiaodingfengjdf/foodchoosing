import { getDeviceId } from "./device";

/** 与 PRD §6.2 埋点事件表逐字一致。 */
export type TrackEvent =
  | "cuisine_category_select"
  | "roulette_spin_click"
  | "roulette_result_action"
  | "recipe_cook_checkin"
  | "badge_unlock_view";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "X-Device-Id": getDeviceId(), ...(init.headers ?? {}) },
  });
  const body = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.code ?? "INTERNAL",
      body?.error?.message ?? res.statusText
    );
  }
  return body;
}

export function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

/** multipart 上传：不能手动设 Content-Type，需由浏览器补 boundary。 */
export function apiForm<T>(path: string, form: FormData): Promise<T> {
  return request<T>(path, { method: "POST", body: form });
}

/**
 * 埋点上报。sendBeacon 无法携带自定义头，故 body 附 device_id 供服务端识别用户。
 */
export function track(eventId: TrackEvent, params: Record<string, unknown> = {}): void {
  const payload = JSON.stringify({ event_id: eventId, params, device_id: getDeviceId() });
  if (typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
  } else {
    void fetch("/api/events", {
      method: "POST",
      body: payload,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    });
  }
}
