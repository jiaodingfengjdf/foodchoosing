import crypto from "node:crypto";
import type { Response, NextFunction } from "express";
import type { DB } from "../db";
import type { AuthedRequest, UserRow } from "../types";
import { nowIso } from "../util/dates";
import { HttpError } from "../util/http";

/**
 * 以 X-Device-Id 识别匿名会话：首次出现即 upsert 一条 users 记录。
 * 后续所有路由通过 req.user 读取用户。
 */
export function deviceAuth(db: DB, options: { required: boolean }) {
  const findByDevice = db.prepare("SELECT * FROM users WHERE device_id = ?");
  const insertUser = db.prepare("INSERT INTO users (id, device_id, created_at) VALUES (?, ?, ?)");

  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    const deviceId = req.header("X-Device-Id");
    if (!deviceId) {
      if (options.required) {
        next(new HttpError(401, "NO_DEVICE", "缺少设备标识"));
        return;
      }
      next();
      return;
    }
    let user = findByDevice.get(deviceId) as UserRow | undefined;
    if (!user) {
      const id = crypto.randomUUID();
      insertUser.run(id, deviceId, nowIso());
      user = { id, device_id: deviceId, settings: "{}" };
    }
    req.user = user;
    next();
  };
}
