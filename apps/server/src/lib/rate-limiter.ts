/**
 * Per-number outbound rate limiter (WhatsApp ban-risk policy).
 *
 * Reactive replies (a reply within an open conversation) are effectively
 * unlimited; proactive / new-contact sends are capped below 30 per hour per
 * sending number. Implemented as an in-process sliding-window counter keyed by
 * the sending instance/number. In-process is sufficient for the single-writer
 * Node server; if the app is ever horizontally scaled this must move to a shared
 * store.
 */

/** Default proactive cap: strictly under 30/hr/number per the ban policy. */
export const PROACTIVE_HOURLY_CAP = 29;
/** Default proactive cap per rolling 24h/number — velocity spikes get numbers banned. */
export const PROACTIVE_DAILY_CAP = Number(process.env.PROACTIVE_DAILY_CAP ?? "200");
const WINDOW_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RateLimitDecision {
  allowed: boolean;
  /** Proactive sends remaining in the current hour for this key. */
  remaining: number;
  /** Whether this send was counted against the proactive cap. */
  counted: boolean;
  /** Which limit blocked the send, when not allowed. */
  reason?: "hourly" | "daily";
}

export class OutboundRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly cap: number;
  private readonly windowMs: number;
  private readonly dailyCap: number;

  constructor(
    cap: number = PROACTIVE_HOURLY_CAP,
    windowMs: number = WINDOW_MS,
    dailyCap: number = PROACTIVE_DAILY_CAP,
  ) {
    this.cap = cap;
    this.windowMs = windowMs;
    this.dailyCap = dailyCap;
  }

  private prune(key: string, now: number): number[] {
    // Keep a full day of timestamps so both the hourly and daily windows can be
    // derived from one bucket.
    const cutoff = now - Math.max(this.windowMs, DAY_MS);
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    this.hits.set(key, recent);
    return recent;
  }

  /**
   * Checks whether a send may proceed and records it if allowed.
   * @param key      sending instance id (one bucket per WhatsApp number)
   * @param reactive true for replies to an active inbound conversation
   */
  check(key: string, reactive: boolean, now: number = Date.now()): RateLimitDecision {
    if (reactive) {
      // Reactive replies bypass the proactive caps entirely.
      return { allowed: true, remaining: this.cap, counted: false };
    }
    const recent = this.prune(key, now);
    const inDay = recent.filter((t) => t > now - DAY_MS).length;
    if (inDay >= this.dailyCap) {
      return { allowed: false, remaining: 0, counted: false, reason: "daily" };
    }
    const inHour = recent.filter((t) => t > now - this.windowMs).length;
    if (inHour >= this.cap) {
      return { allowed: false, remaining: 0, counted: false, reason: "hourly" };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.cap - inHour - 1, counted: true };
  }

  /** Test/maintenance helper: clears all buckets. */
  reset(): void {
    this.hits.clear();
  }
}

export const outboundRateLimiter = new OutboundRateLimiter();
