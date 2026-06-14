import { runWahaHealthCheck } from "./waha-health.js";
import { processDueJobs } from "./queue.js";
import { checkCeoSchedules } from "../services/ceo/index.js";
import { runMediaCleanup, runWebhookCleanup, runErrorLogCleanup } from "./cleanup.js";
import { runSubscriptionReminders } from "./reminders.js";
import { runWhatsappFollowups } from "./followups.js";
import { processGroupAddQueue } from "../services/groups/queue-processor.js";
import { generateDueRecurringExpenses } from "../services/accounting/recurring.js";
import { expireStaleApprovals } from "../services/growth/approvals.js";
import { enqueueCompanyCeoReport, runDailyContentDraft, runDailyFunnelDraft, runDailyAftersales } from "../services/growth/index.js";

/**
 * Minimal interval-based job scheduler. The plan suggested node-cron, but the
 * only scheduled work is fixed-interval polling ("every few minutes"), which a
 * plain setInterval handles without adding a dependency. If cron expressions are
 * ever needed (e.g. daily report rollups), introduce node-cron then.
 */

const WAHA_HEALTH_INTERVAL_MS = 3 * 60 * 1000;
const JOB_QUEUE_INTERVAL_MS = 5 * 1000;
const CEO_SCHEDULE_INTERVAL_MS = 60 * 1000;
const FOLLOWUP_INTERVAL_MS = 2 * 60 * 1000;
const GROUP_QUEUE_INTERVAL_MS = 60 * 1000;
const APPROVAL_EXPIRY_INTERVAL_MS = 60 * 60 * 1000;
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
    void checkCeoSchedules().catch(() => {
      // Schedule-eval failures retry next tick; job-level errors live on rows.
    });
  }, CEO_SCHEDULE_INTERVAL_MS);
  ceoSchedules.unref();
  timers.push(ceoSchedules);

  const followups = setInterval(() => {
    void runWhatsappFollowups().catch(() => {
      // Per-item failures are recorded on the queue row; swallow sweep errors.
    });
  }, FOLLOWUP_INTERVAL_MS);
  followups.unref();
  timers.push(followups);

  const groupQueue = setInterval(() => {
    void processGroupAddQueue().catch(() => {
      // Per-queue failures are recorded on the row; swallow sweep-level errors.
    });
  }, GROUP_QUEUE_INTERVAL_MS);
  groupQueue.unref();
  timers.push(groupQueue);

  // Growth approval gate: expire stale awaiting_approval rows past their TTL so
  // an unanswered action doesn't linger executable forever.
  const approvalExpiry = setInterval(() => {
    void expireStaleApprovals().catch(() => {
      // Best-effort sweep; errors are non-fatal and retry next hour.
    });
  }, APPROVAL_EXPIRY_INTERVAL_MS);
  approvalExpiry.unref();
  timers.push(approvalExpiry);

  const dailySweeps = setInterval(() => {
    void runMediaCleanup().catch(() => {
      // Best-effort retention; errors are non-fatal and retry next day.
    });
    void enqueueCompanyCeoReport().catch(() => {
      // Dedupe-keyed by date; safe to call every interval. Swallow tick errors.
    });
    void runDailyContentDraft().catch(() => {
      // Content autopilot: date-gated to once/day; only DRAFTS for approval,
      // never publishes. Swallow tick errors and retry next day.
    });
    void runDailyFunnelDraft().catch(() => {
      // Funnel autopilot: date-gated to once/day; only DRAFTS for approval,
      // never sends. Swallow tick errors and retry next day.
    });
    void runDailyAftersales().catch(() => {
      // After-sales autopilot (M4): date-gated to once/day. Auto-sends only
      // founder-approved templates to consented owners (opt-out/quiet-hours/cap
      // enforced downstream); unapproved templates queue ONE approval and skip.
      // Swallow tick errors and retry next day.
    });
    void runWebhookCleanup().catch(() => {
      // Best-effort retention; errors are non-fatal and retry next day.
    });
    void runSubscriptionReminders().catch(() => {
      // Best-effort reminders; errors are non-fatal and retry next day.
    });
    void generateDueRecurringExpenses().catch(() => {
      // Best-effort generation; errors are non-fatal and retry next day.
    });
    void runErrorLogCleanup().catch(() => {
      // Best-effort retention; errors are non-fatal and retry next day.
    });
  }, DAILY_INTERVAL_MS);
  dailySweeps.unref();
  timers.push(dailySweeps);

  // Run the error-log prune once at boot too — cheap, and bounds the table if the
  // process was restarting more often than the daily interval fires.
  void runErrorLogCleanup().catch(() => {
    // Best-effort; non-fatal at boot.
  });
}

/** Stops all background jobs (used on shutdown / in tests). */
export function stopScheduler(): void {
  for (const timer of timers) {
    clearInterval(timer);
  }
  timers.length = 0;
}
