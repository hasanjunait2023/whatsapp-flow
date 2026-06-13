import { dbAll, dbRun } from "../../db/raw.js";
import { emitChange } from "../../realtime/emitter.js";
import { enqueueJob, registerJobHandler } from "../../jobs/queue.js";
import { generateCeoReport, deliverReport, gatherSnapshot, type ReportType } from "./report.js";
import { generateMarketingIdeas } from "./marketing.js";

/**
 * CEO agent orchestration: the durable job that generates+delivers a report,
 * and the schedule tick that enqueues due reports from agent_schedules.
 * Schedules are UTC-based v1 (hour_utc); weekly reports go out on Monday.
 */

export const CEO_REPORT_JOB = "ceo_report";
const WEEKLY_DOW_UTC = 1; // Monday

interface CeoJobPayload {
  tenantId: string;
  type: ReportType;
  scheduleId?: string;
}

async function runCeoJob(payload: unknown): Promise<void> {
  const { tenantId, type, scheduleId } = payload as CeoJobPayload;

  if (type === "marketing_ideas") {
    const reportId = crypto.randomUUID();
    await dbRun(
      `INSERT INTO ceo_reports (id, tenant_id, type, status) VALUES (?, ?, 'marketing_ideas', 'generating')`,
      reportId,
      tenantId,
    );
    try {
      const content = await generateMarketingIdeas(tenantId);
      await dbRun(
        `UPDATE ceo_reports SET status = 'generated', content_md = ?, data_snapshot = ? WHERE id = ?`,
        content,
        JSON.stringify(await gatherSnapshot(tenantId, 30)),
        reportId,
      );
      await deliverReport(tenantId, reportId, content);
      emitChange("ceo_reports", tenantId, { id: reportId });
    } catch (err) {
      await dbRun(
        `UPDATE ceo_reports SET status = 'error', error = ? WHERE id = ?`,
        err instanceof Error ? err.message : "generation failed",
        reportId,
      );
      emitChange("ceo_reports", tenantId, { id: reportId });
      throw err;
    }
  } else {
    await generateCeoReport(tenantId, type);
  }

  if (scheduleId) {
    await dbRun(
      `UPDATE agent_schedules SET last_run_at = ?, updated_at = ? WHERE id = ?`,
      new Date().toISOString(),
      new Date().toISOString(),
      scheduleId,
    );
  }
}

interface ScheduleRow {
  id: string;
  tenant_id: string;
  cadence: string;
  hour_utc: number;
  report_type: string;
  last_run_at: string | null;
}

function isDue(schedule: ScheduleRow, now: Date): boolean {
  if (now.getUTCHours() < schedule.hour_utc) return false;
  if (schedule.cadence === "weekly" && now.getUTCDay() !== WEEKLY_DOW_UTC) return false;

  if (!schedule.last_run_at) return true;
  const today = now.toISOString().slice(0, 10);
  return schedule.last_run_at.slice(0, 10) < today;
}

/** Called every minute by the scheduler: enqueues due CEO reports. */
export async function checkCeoSchedules(): Promise<void> {
  const now = new Date();
  const schedules = (await dbAll(
    `SELECT id, tenant_id, cadence, hour_utc, report_type, last_run_at
       FROM agent_schedules WHERE enabled = true AND agent = 'ceo'`,
  )) as ScheduleRow[];

  for (const schedule of schedules) {
    if (!isDue(schedule, now)) continue;
    await enqueueJob({
      kind: CEO_REPORT_JOB,
      tenantId: schedule.tenant_id,
      payload: {
        tenantId: schedule.tenant_id,
        type: schedule.report_type as ReportType,
        scheduleId: schedule.id,
      },
      dedupeKey: `ceo_schedule:${schedule.id}`,
    });
  }
}

export async function enqueueCeoReport(tenantId: string, type: ReportType): Promise<string> {
  return enqueueJob({
    kind: CEO_REPORT_JOB,
    tenantId,
    payload: { tenantId, type },
    dedupeKey: `ceo_adhoc:${tenantId}:${type}`,
  });
}

export function registerCeoJobs(): void {
  registerJobHandler(CEO_REPORT_JOB, runCeoJob);
}
