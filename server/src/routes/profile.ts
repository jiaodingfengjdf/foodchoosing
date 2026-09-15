import { Router, type Response } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { statDate, addDays } from "../util/dates";
import { computeStreak } from "../services/streak";

const CONTINENT_EMOJI: Record<string, string> = {
  亚洲: "🏯", 欧洲: "🏰", 非洲: "🦁", 北美洲: "🗽", 南美洲: "🌄", 大洋洲: "🐨",
};

const CALENDAR_DAYS = 30;
const HISTORY_LIMIT = 50;

const settingsSchema = z.object({
  difficulty_pref: z.enum(["easy", "medium", "hard"]).nullable(),
});

/** 个人中心：汇总、设置。 */
export function profileRouter(db: DB): Router {
  const router = Router();

  const selectDates = db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?");
  const countCheckins = db.prepare("SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?");
  const selectContinents = db.prepare(
    `SELECT DISTINCT c1.name AS continent, c3.name AS country, r.id AS recipe_id
       FROM checkins ck
       JOIN recipes r ON r.id = ck.recipe_id
       JOIN cuisines c4 ON c4.id = r.cuisine_id
       JOIN cuisines c3 ON c3.id = c4.parent_id
       JOIN cuisines c2 ON c2.id = c3.parent_id
       JOIN cuisines c1 ON c1.id = c2.parent_id AND c1.level = 1
      WHERE ck.user_id = ?`
  );
  // 昨日（stat_date 口径）转出但未打卡的最近菜品
  const selectPending = db.prepare(
    `SELECT r.id AS recipe_id, r.name, r.emoji FROM spin_history s
       JOIN recipes r ON r.id = s.recipe_id
      WHERE s.user_id = ? AND s.action = 'spin' AND substr(s.created_at, 1, 10) >= ?
        AND NOT EXISTS (
          SELECT 1 FROM checkins ck
           WHERE ck.user_id = s.user_id AND ck.recipe_id = s.recipe_id AND ck.stat_date = ?
        )
      ORDER BY s.created_at DESC LIMIT 1`
  );
  const selectHistory = db.prepare(
    `SELECT ck.id AS checkin_id, ck.recipe_id, r.name, r.emoji, ck.photo_path, ck.rating, ck.stat_date
       FROM checkins ck JOIN recipes r ON r.id = ck.recipe_id
      WHERE ck.user_id = ? ORDER BY ck.created_at DESC LIMIT ${HISTORY_LIMIT}`
  );
  const selectSettings = db.prepare("SELECT settings FROM users WHERE id = ?");
  const updateSettings = db.prepare("UPDATE users SET settings = ? WHERE id = ?");

  router.get("/profile/summary", (req: AuthedRequest, res: Response) => {
    const userId = req.user!.id;
    const today = statDate();
    const yesterday = addDays(today, -1);

    const dates = (selectDates.all(userId) as { stat_date: string }[]).map((r) => r.stat_date);
    const streak = computeStreak(dates, today);
    const calendar = [...new Set(dates)].filter((d) => d >= addDays(today, -(CALENDAR_DAYS - 1))).sort();
    const total = (countCheckins.get(userId) as { n: number }).n;

    const continentRows = selectContinents.all(userId) as {
      continent: string; country: string; recipe_id: string;
    }[];
    const continents = [...new Set(continentRows.map((r) => r.continent))].map((name) => {
      const rowsOf = continentRows.filter((r) => r.continent === name);
      return {
        name,
        emoji: CONTINENT_EMOJI[name] ?? "🌍",
        countries: new Set(rowsOf.map((r) => r.country)).size,
        dishes: new Set(rowsOf.map((r) => r.recipe_id)).size,
      };
    });

    const pending = selectPending.get(userId, yesterday, yesterday) ?? null;
    const history = selectHistory.all(userId);

    res.json({
      streak,
      total_checkins: total,
      calendar,
      continents,
      pending_checkin: pending,
      history,
    });
  });

  router.patch("/profile/settings", (req: AuthedRequest, res: Response) => {
    const { difficulty_pref } = settingsSchema.parse(req.body);
    const user = selectSettings.get(req.user!.id) as { settings: string };
    const settings = { ...(JSON.parse(user.settings) as Record<string, unknown>), difficulty_pref };
    updateSettings.run(JSON.stringify(settings), req.user!.id);
    res.json({ settings });
  });

  return router;
}
