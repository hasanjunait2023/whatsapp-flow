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
const WINDOW_MS = 60 * 60 * 1000;

export interface RateLimitDecision {
  allowed: boolean;
  /** Proactive sends remaining in the current hour for this key. */
  remaining: number;
  /** Whether this send was counted against the proactive cap. */
  counted: boolean;
}

export class OutboundRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly cap: number;
  private readonly windowMs: number;

  constructor(cap: number = PROACTIVE_HOURLY_CAP, windowMs: number = WINDOW_MS) {
    this.cap = cap;
    this.windowMs = windowMs;
  }

  private prune(key: string, now: number): number[] {
    const cutoff = now - this.windowMs;
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
      // Reactive replies bypass the proactive cap entirely.
      return { allowed: true, remaining: this.cap, counted: false };
    }
    const recent = this.prune(key, now);
    if (recent.length >= this.cap) {
      return { allowed: false, remaining: 0, counted: false };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, remaining: this.cap - recent.length, counted: true };
  }

  /** Test/maintenance helper: clears all buckets. */
  reset(): void {
    this.hits.clear();
  }
}

export const outboundRateLimiter = new OutboundRateLimiter();
