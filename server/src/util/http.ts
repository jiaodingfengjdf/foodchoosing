import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

/** body-parser / 中间件抛出的、自带 4xx 状态码的错误 */
interface StatusBearingError {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
}

function clientStatus(err: unknown): number | undefined {
  const e = err as StatusBearingError;
  const raw = typeof e?.status === "number" ? e.status : typeof e?.statusCode === "number" ? e.statusCode : undefined;
  return raw !== undefined && raw >= 400 && raw < 500 ? raw : undefined;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: err.issues.map((i) => i.message).join("; ") },
    });
    return;
  }
  // multer 抛出的 MulterError 不带 status，需显式映射，否则会被错报成 500
  const m = err as { name?: unknown; code?: unknown };
  if (m?.name === "MulterError") {
    const tooLarge = m.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 422 : 400).json({
      error: {
        code: tooLarge ? "PHOTO_TOO_LARGE" : "VALIDATION_ERROR",
        message: tooLarge ? "照片太大啦，请压缩到 5MB 以内" : "上传的文件不符合要求，请重新上传",
      },
    });
    return;
  }
  // express.json() 遇到非法 JSON 会抛 400；不应错报成 500
  const status = clientStatus(err);
  if (status !== undefined) {
    const message = (err as StatusBearingError).message;
    res.status(status).json({
      error: {
        code: status === 400 ? "BAD_REQUEST" : `HTTP_${status}`,
        message: typeof message === "string" && message ? message : "请求格式有误",
      },
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "服务器开小差了，请稍后再试" } });
}
