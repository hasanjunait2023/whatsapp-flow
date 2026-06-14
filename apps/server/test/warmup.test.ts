import { describe, it, expect } from "vitest";
import { warmupState } from "../src/lib/warmup.js";
import { PROACTIVE_DAILY_CAP } from "../src/lib/rate-limiter.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function daysAgo(n: number): string {
  return new Date(NOW - n * DAY).toISOString();
}

describe("warmupState", () => {
  it("treats a never-connected number as brand new with a tiny cap", () => {
    const s = warmupState(null, NOW);
    expect(s.phase).toBe("new");
    expect(s.dailyCap).toBe(10);
  });

  it("is 'new' on day 0", () => {
    expect(warmupState(daysAgo(0), NOW).phase).toBe("new");
  });

  it("ramps the cap up through the warming phase (days 1-7)", () => {
    const d1 = warmupState(daysAgo(1), NOW);
    const d7 = warmupState(daysAgo(7), NOW);
    expect(d1.phase).toBe("warming");
    expect(d7.phase).toBe("warming");
    expect(d7.dailyCap).toBeGreaterThan(d1.dailyCap);
    expect(d7.dailyCap).toBeLessThanOrEqual(50);
  });

  it("enters 'ramp' between days 8-21 with a higher cap", () => {
    const s = warmupState(daysAgo(14), NOW);
    expect(s.phase).toBe("ramp");
    expect(s.dailyCap).toBeGreaterThan(50);
    expect(s.dailyCap).toBeLessThanOrEqual(150);
  });

  it("is fully 'ready' at the global cap after ~3 weeks", () => {
    const s = warmupState(daysAgo(30), NOW);
    expect(s.phase).toBe("ready");
    expect(s.dailyCap).toBe(PROACTIVE_DAILY_CAP);
  });

  it("never exceeds the global cap", () => {
    for (let d = 0; d <= 60; d++) {
      expect(warmupState(daysAgo(d), NOW).dailyCap).toBeLessThanOrEqual(PROACTIVE_DAILY_CAP);
    }
  });
});
