import { enqueueJob } from "../../jobs/queue.js";
import { registerGrowthSocialJobs } from "./social.js";
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
