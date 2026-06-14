import type { Context, MiddlewareHandler } from "hono";

/**
 * In-process fixed-window HTTP rate limiter. Zero-dependency; sufficient for the
 * current single-instance deployment. NOTE: like lib/rate-limiter.ts (the
 * WhatsApp send limiter), this state is per-process — when the app is
 * horizontally scaled (roadmap P2) both must move to a shared Redis store, or
 * each instance enforces its own quota and the real limit becomes N×.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  /** Window length in ms. */
  windowMs: number;
  /** Max requests per key per window. */
  max: number;
  /** Derives the bucket key (IP, userId, …). Defaults to client IP. */
  keyFn?: (c: Context) => string;
  /** Bucket namespace so independent limiters don't collide. */
  name: string;
}

const store = new Map<string, Bucket>();

// Periodic sweep so the map doesn't grow unbounded with stale keys.
const SWEEP_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}, SWEEP_MS).unref();

function clientIp(c: Context): string {
  const xff = c.req.header("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return c.req.header("x-real-ip") ?? "unknown";
}

export function rateLimit(opts: RateLimitOptions): MiddlewareHandler {
  const keyFn = opts.keyFn ?? clientIp;
  return async (c, next) => {
    const key = `${opts.name}:${keyFn(c)}`;
    const now = Date.now();
    let bucket = store.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, bucket);
    }
    bucket.count += 1;
    const remaining = Math.max(0, opts.max - bucket.count);
    c.header("X-RateLimit-Limit", String(opts.max));
    c.header("X-RateLimit-Remaining", String(remaining));
    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json(
        { error: { message: "Too many requests. Slow down.", code: "RATE_LIMITED" } },
        429,
      );
    }
    await next();
  };
}
