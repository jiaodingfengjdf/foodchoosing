import { Router, type Response } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { nowIso } from "../util/dates";

/** 与 PRD §6.2 埋点事件表逐字一致。 */
const EVENT_IDS = [
  "cuisine_category_select",
  "roulette_spin_click",
  "roulette_result_action",
  "recipe_cook_checkin",
  "badge_unlock_view",
] as const;

const eventSchema = z.object({
  event_id: z.enum(EVENT_IDS),
  params: z.record(z.unknown()).optional(),
  device_id: z.string().optional(),
});

/**
 * 埋点上报。可匿名：sendBeacon 无法设置自定义头，故允许用 body.device_id 标识；
 * 解析不到用户时 user_id 存 null——埋点不应因会话缺失而失败。
 */
export function eventsRouter(db: DB): Router {
  const router = Router();

  const selectUserByDevice = db.prepare("SELECT id FROM users WHERE device_id = ?");
  const insertEvent = db.prepare(
    "INSERT INTO events (user_id, event_id, params, created_at) VALUES (?, ?, ?, ?)"
  );

  router.post("/events", (req: AuthedRequest, res: Response) => {
    const body = eventSchema.parse(req.body);
    let userId: string | null = req.user?.id ?? null;
    if (!userId && body.device_id) {
      const found = selectUserByDevice.get(body.device_id) as { id: string } | undefined;
      userId = found?.id ?? null;
    }
    insertEvent.run(userId, body.event_id, JSON.stringify(body.params ?? {}), nowIso());
    res.status(202).json({});
  });

  return router;
}
