import { Request, Response, NextFunction } from "express";
import { AppError } from "./AppError";

type Bucket = { count: number; windowStart: number };

export function createUserRateLimiter(opts: {
  max: number;         // max requests per window
  windowMs: number;    // window size in milliseconds
  key: string;         // unique identifier for this limiter (used for separate buckets per endpoint)
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, _res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) return next();
    const bucketKey = `${opts.key}:${userId}`;
    const now = Date.now();
    const existing = buckets.get(bucketKey);
    if (!existing || now - existing.windowStart >= opts.windowMs) {
      buckets.set(bucketKey, { count: 1, windowStart: now });
      return next();
    }
    existing.count += 1;
    if (existing.count > opts.max) {
      return next(AppError("Too many requests, please slow down", 429));
    }
    next();
  };
}
