import { describe, it, expect } from "vitest";
import { OutboundRateLimiter, PROACTIVE_HOURLY_CAP } from "../src/lib/rate-limiter.js";

/**
 * Per-number outbound rate limiter: proactive sends capped under 30/hr/number,
 * reactive replies bypass the cap entirely.
 */

describe("OutboundRateLimiter", () => {
  it("caps proactive sends at the configured limit per number", () => {
    const limiter = new OutboundRateLimiter(3, 60_000);
    expect(limiter.check("num-1", false).allowed).toBe(true);
    expect(limiter.check("num-1", false).allowed).toBe(true);
    expect(limiter.check("num-1", false).allowed).toBe(true);
    const blocked = limiter.check("num-1", false);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("lets reactive replies bypass the cap unconditionally", () => {
    const limiter = new OutboundRateLimiter(2, 60_000);
    limiter.check("num-1", false);
    limiter.check("num-1", false); // proactive cap now exhausted
    for (let i = 0; i < 50; i++) {
      const decision = limiter.check("num-1", true);
      expect(decision.allowed).toBe(true);
      expect(decision.counted).toBe(false);
    }
  });

  it("scopes buckets per number", () => {
    const limiter = new OutboundRateLimiter(1, 60_000);
    expect(limiter.check("num-1", false).allowed).toBe(true);
    expect(limiter.check("num-1", false).allowed).toBe(false);
    // A different number has its own bucket.
    expect(limiter.check("num-2", false).allowed).toBe(true);
  });

  it("frees capacity as the sliding window advances", () => {
    const limiter = new OutboundRateLimiter(1, 1000);
    const t0 = 1_000_000;
    expect(limiter.check("num-1", false, t0).allowed).toBe(true);
    expect(limiter.check("num-1", false, t0 + 500).allowed).toBe(false);
    // After the window elapses the old hit is pruned.
    expect(limiter.check("num-1", false, t0 + 1500).allowed).toBe(true);
  });

  it("defaults to a cap strictly under 30 per hour", () => {
    expect(PROACTIVE_HOURLY_CAP).toBeLessThan(30);
  });
});
