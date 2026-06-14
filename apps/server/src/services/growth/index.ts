import { enqueueJob } from "../../jobs/queue.js";
import { dbGet, dbRun } from "../../db/raw.js";
import { registerGrowthSocialJobs } from "./social.js";
import { draftDueSocialPosts } from "./content-scheduler.js";
import {
  registerFounderReportJobs,
  COMPANY_CEO_REPORT_JOB,
  COMPANY_TENANT_ID,
} from "./founder-report.js";

/**
 * Growth subsystem boot wiring. Registers the execution + reporting job handlers
 * (called once at boot from index.ts beside the other registerXxxJobs()).
 */
export function registerGrowthJobs(): void {
  registerGrowthSocialJobs();
  registerFounderReportJobs();
}

/**
 * Enqueues the company daily digest, deduped per UTC date so the hourly/daily
 * scheduler tick can call this every interval without queuing duplicates.
 */
export async function enqueueCompanyCeoReport(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  return enqueueJob({
    kind: COMPANY_CEO_REPORT_JOB,
    tenantId: COMPANY_TENANT_ID,
    dedupeKey: `company_ceo_report:${today}`,
  });
}

/**
 * Content autopilot daily tick. Drafts due social posts through the approval
 * gate, at most once per UTC date. The date guard makes this safe to call on
 * every scheduler interval: the first call of the day wins the insert, later
 * calls dedupe to the same queued/done job row and become no-ops. The actual
 * draft sweep runs inline here (not via a queued handler) because it is a quick
 * idempotent UPDATE sweep like the approval-expiry tick.
 */
export async function runDailyContentDraft(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const claimed = await enqueueJob({
    kind: GROWTH_DAILY_CONTENT_MARKER,
    tenantId: COMPANY_TENANT_ID,
    dedupeKey: `growth_daily_content:${today}`,
  });
  // enqueueJob returns the existing row's id on dedupe; we can't tell new-vs-
  // existing from the id alone, so check the marker row's status: a freshly
  // inserted marker is 'queued'; if it's already 'running'/'done' another tick
  // today claimed it and we skip. (The marker job has no handler — it exists
  // only as a per-day lock; we mark it done ourselves on the run that owns it.)
  const row = (await dbGet(
    `SELECT status FROM job_queue WHERE id = ?`,
    claimed,
  )) as { status: string } | undefined;
  if (!row || row.status !== "queued") return 0;

  // Take ownership: flip the marker queued -> done so a concurrent tick that
  // also read 'queued' loses the rowcount race and returns 0.
  const own = await dbRun(
    `UPDATE job_queue SET status = 'done', updated_at = ? WHERE id = ? AND status = 'queued'`,
    new Date().toISOString(),
    claimed,
  );
  if (own.changes !== 1) return 0;

  return draftDueSocialPosts();
}

/** Marker job kind used purely as a per-day lock for the content-draft tick. */
const GROWTH_DAILY_CONTENT_MARKER = "growth_daily_content_marker";
