import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";
import { Router, type Response } from "express";
import { z } from "zod";
import type { DB } from "../db";
import type { AuthedRequest } from "../types";
import { statDate, nowIso } from "../util/dates";
import { computeStreak } from "../services/streak";
import { evaluateBadges } from "../services/badges";
import { moderateCheckin } from "../services/moderation";
import { HttpError } from "../util/http";

const UPLOAD_DIR = path.resolve("uploads");
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname || "") || ".jpg"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new HttpError(400, "VALIDATION_ERROR", "图片或内容包含违规信息，请重新上传"));
  },
});

const checkinSchema = z.object({
  recipe_id: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().max(100).optional(),
});

/** 打卡结算：落库 → 重算连击 → 判定徽章，全在一个事务内。 */
export function checkinsRouter(db: DB): Router {
  const router = Router();

  const selectRecipe = db.prepare("SELECT id FROM recipes WHERE id = ?");
  const insertCheckin = db.prepare(
    `INSERT INTO checkins (id, user_id, recipe_id, photo_path, rating, review, stat_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const selectDates = db.prepare("SELECT stat_date FROM checkins WHERE user_id = ?");

  router.post("/checkins", upload.single("photo"), (req: AuthedRequest, res: Response) => {
    const body = checkinSchema.parse({
      recipe_id: req.body.recipe_id,
      rating: req.body.rating,
      review: req.body.review || undefined,
    });

    if (!selectRecipe.get(body.recipe_id)) throw new HttpError(404, "NOT_FOUND", "菜谱不存在");
    moderateCheckin(body.review, req.file?.path);

    const userId = req.user!.id;
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const today = statDate();

    const result = db.transaction(() => {
      const id = `CK${Date.now()}${Math.floor(Math.random() * 1000)}`;
      insertCheckin.run(id, userId, body.recipe_id, photoPath, body.rating, body.review ?? null, today, nowIso());
      const dates = (selectDates.all(userId) as { stat_date: string }[]).map((r) => r.stat_date);
      return { id, streak: computeStreak(dates, today), newBadges: evaluateBadges(db, userId, new Date()) };
    })();

    res.json({
      checkin_id: result.id,
      streak: result.streak.current,
      max_streak: result.streak.max,
      stat_date: today,
      new_badges: result.newBadges.map((b) => ({
        id: b.id,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
      })),
    });
  });

  return router;
}
