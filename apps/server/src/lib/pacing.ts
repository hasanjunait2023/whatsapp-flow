/**
 * Human-like send pacing for proactive/bulk WhatsApp sends. Fixed-interval
 * sending is a machine fingerprint WhatsApp detects → bans. We insert a
 * randomized delay between bulk sends (never for reactive 1:1 replies, which
 * stay instant). Tunable via env.
 */

const BASE_MS = Number(process.env.SEND_PACING_BASE_MS ?? "10000"); // 10s base
const JITTER_FRAC = Number(process.env.SEND_PACING_JITTER ?? "0.5"); // ±50%

/** A jittered inter-send delay in ms (e.g. base 10s → ~5–15s), never negative. */
export function proactiveSendDelayMs(rand: () => number = Math.random): number {
  const jitter = BASE_MS * JITTER_FRAC;
  const delta = (rand() * 2 - 1) * jitter; // [-jitter, +jitter]
  return Math.max(1000, Math.round(BASE_MS + delta));
}

/** Sleep helper. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Whether the local hour is inside allowed sending hours (default 8:00–21:59).
 * Bulk campaigns outside this window read as bot activity. Server runs UTC; an
 * offset (minutes) lets callers shift to the tenant's region (BD = +360).
 */
const START_HOUR = Number(process.env.SEND_HOURS_START ?? "8");
const END_HOUR = Number(process.env.SEND_HOURS_END ?? "22"); // exclusive

export function isWithinSendingHours(
  offsetMinutes = Number(process.env.SEND_TZ_OFFSET_MIN ?? "360"), // default BD (UTC+6)
  now: Date = new Date(),
): boolean {
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  const hour = local.getUTCHours();
  return hour >= START_HOUR && hour < END_HOUR;
}
