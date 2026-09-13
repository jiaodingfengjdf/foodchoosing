import type { Request } from "express";

export interface UserRow {
  id: string;
  device_id: string;
  settings: string;
}

export interface AuthedRequest extends Request {
  user?: UserRow;
}
