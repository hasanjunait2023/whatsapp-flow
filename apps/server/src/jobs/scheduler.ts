import { runWahaHealthCheck } from "./waha-health.js";
import { processDueJobs } from "./queue.js";
import { checkCeoSchedules } from "../services/ceo/index.js";

/**
 * Minimal interval-based job scheduler. The plan suggested node-cron, but the
 * only scheduled work is fixed-interval polling ("every few minutes"), which a
 * plain setInterval handles without adding a dependency. If cron expressions are
 * ever needed (e.g. daily report rollups), introduce node-cron then.
 */

const WAHA_HEALTH_INTERVAL_MS = 3 * 60 * 1000;
const JOB_QUEUE_INTERVAL_MS = 5 * 1000;
const CEO_SCHEDULE_INTERVAL_MS = 60 * 1000;

const timers: NodeJS.Timeout[] = [];

/** Registers and starts all background jobs. Safe to call once at boot. */
export function startScheduler(): void {
  const wahaHealth = setInterval(() => {
    void runWahaHealthCheck().catch(() => {
      // Errors are handled per-instance inside the job; swallow sweep-level errors.
    });
  }, WAHA_HEALTH_INTERVAL_MS);
  wahaHealth.unref();
  timers.push(wahaHealth);

  const jobQueue = setInterval(() => {
    void processDueJobs().catch(() => {
      // Per-job errors are persisted on the job row; swallow tick-level errors.
    });
  }, JOB_QUEUE_INTERVAL_MS);
  jobQueue.unref();
  timers.push(jobQueue);

  const ceoSchedules = setInterval(() => {
    try {
      checkCeoSchedules();
    } catch {
      // Schedule-eval failures retry next tick; job-level errors live on rows.
    }
  }, CEO_SCHEDULE_INTERVAL_MS);
  ceoSchedules.unref();
  timers.push(ceoSchedules);
}

/** Stops all background jobs (used on shutdown / in tests). */
export function stopScheduler(): void {
  for (const timer of timers) {
    clearInterval(timer);
  }
  timers.length = 0;
}
