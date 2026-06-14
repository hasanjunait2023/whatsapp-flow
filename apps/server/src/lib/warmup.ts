import { PROACTIVE_DAILY_CAP } from "./rate-limiter.js";

/**
 * Number warm-up ramp. A freshly-linked WhatsApp number that immediately blasts
 * messages is the most common cause of an instant ban. The daily proactive cap
 * therefore scales up with the number's warm-up age (days since it first reached
 * WORKING) instead of jumping straight to the full cap.
 *
 * Reactive replies are NOT limited by warm-up — only proactive/campaign sends.
 */

export type WarmupPhase = "new" | "warming" | "ramp" | "ready";

export interface WarmupState {
  phase: WarmupPhase;
  /** Whole days since warm-up started (0 on the first day). */
  day: number;
  /** Max proactive sends allowed today for this number. */
  dailyCap: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function warmupState(
  startedAt: string | null | undefined,
  now: number = Date.now(),
): WarmupState {
  if (!startedAt) return { phase: "new", day: 0, dailyCap: 10 };
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return { phase: "new", day: 0, dailyCap: 10 };

  const day = Math.max(0, Math.floor((now - started) / DAY_MS));

  if (day < 1) return { phase: "new", day, dailyCap: 10 };
  if (day <= 7) {
    // Days 1–7: 20 → 50.
    return { phase: "warming", day, dailyCap: Math.min(50, 20 + (day - 1) * 5) };
  }
  if (day <= 21) {
    // Days 8–21: ~57 → 150.
    return { phase: "ramp", day, dailyCap: Math.min(150, 50 + (day - 7) * 7) };
  }
  return { phase: "ready", day, dailyCap: PROACTIVE_DAILY_CAP };
}
