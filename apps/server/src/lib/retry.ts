/**
 * Exponential-backoff retry helpers ported from the Wasender send-message edge
 * function. Used by the outbound messaging path so WAHA send failures retry with
 * jittered backoff instead of failing on the first transient error.
 */

export const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 15000;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with jitter, capped at MAX_BACKOFF_MS. */
export function calculateBackoff(attempt: number): number {
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 500;
  return Math.min(exponential + jitter, MAX_BACKOFF_MS);
}

/** HTTP status / message combinations worth retrying. */
export function isRetryableError(status: number, message: string): boolean {
  if (status === 429 || status === 408) return true;
  if (status >= 500 && status < 600) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("connection reset") ||
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("econnreset") ||
    lower.includes("socket") ||
    lower.includes("network")
  );
}

/** Permanent failures that must not be retried. */
export function isNonRetryableError(status: number, message: string): boolean {
  if (status === 401 || status === 403 || status === 404) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("invalid phone") ||
    lower.includes("not connected") ||
    lower.includes("not as expected") ||
    lower.includes("session status")
  );
}
