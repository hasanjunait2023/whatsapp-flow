import { dbAll, dbRun } from "../../db/raw.js";
import { registerJobHandler } from "../../jobs/queue.js";
import { sendTelegramMessage, escapeTelegramMarkdown } from "../telegram.js";
import { GROWTH_TELEGRAM_CHAT_ID } from "../../lib/env.js";

/**
 * Minimal company-level CEO report for the autonomous growth system. Unlike the
 * per-tenant CEO report, this aggregates the COMPANY's own growth state (the
 * approval gate, social posts, marketing leads) and digests it to the founder.
 *
 * COMPANY_TENANT_ID is a sentinel tenant id for company-owned ceo_reports rows
 * so they don't collide with real tenants.
 */

export const COMPANY_CEO_REPORT_JOB = "company_ceo_report";
export const COMPANY_TENANT_ID = "00000000-0000-0000-0000-00000000c0c0";

export interface CompanySnapshot {
  approvals: Record<string, number>;
  social_posts: Record<string, number>;
  leads: Record<string, number>;
  pending_approvals: Array<{ id: string; artifact_type: string; summary: string }>;
}

type CountRow = { status: string | null; n: number };

function toCountMap(rows: CountRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status ?? "unknown"] = r.n;
  return out;
}

/** Aggregates company growth counts + the current pending-approval list. */
export async function gatherCompanySnapshot(): Promise<CompanySnapshot> {
  // Three explicit, static queries — no table name is ever interpolated into SQL.
  const approvals = toCountMap(
    (await dbAll(`SELECT status, COUNT(*)::int AS n FROM growth_approvals GROUP BY status`)) as CountRow[],
  );
  const social_posts = toCountMap(
    (await dbAll(`SELECT status, COUNT(*)::int AS n FROM social_posts GROUP BY status`)) as CountRow[],
  );
  const leads = toCountMap(
    (await dbAll(`SELECT status, COUNT(*)::int AS n FROM marketing_leads GROUP BY status`)) as CountRow[],
  );

  const pending = (await dbAll(
    `SELECT id, artifact_type, summary FROM growth_approvals
       WHERE status = 'awaiting_approval' ORDER BY created_at DESC LIMIT 20`,
  )) as Array<{ id: string; artifact_type: string; summary: string }>;

  return { approvals, social_posts, leads, pending_approvals: pending };
}

function digestMarkdown(snap: CompanySnapshot): string {
  const counts = (label: string, m: Record<string, number>): string => {
    const entries = Object.entries(m);
    if (entries.length === 0) return `*${label}:* none`;
    return `*${label}:* ${entries.map(([k, v]) => `${k} ${v}`).join(", ")}`;
  };

  const lines = [
    "*Company growth — daily digest*",
    "",
    counts("Approvals", snap.approvals),
    counts("Social posts", snap.social_posts),
    counts("Leads", snap.leads),
  ];

  if (snap.pending_approvals.length > 0) {
    lines.push("", `*Pending approval (${snap.pending_approvals.length}):*`);
    for (const p of snap.pending_approvals) {
      // artifact_type + summary are caller/AI-supplied; escape for Markdown.
      lines.push(
        `• [${escapeTelegramMarkdown(p.artifact_type)}] ${escapeTelegramMarkdown(p.summary)}`,
      );
    }
  }

  return lines.join("\n");
}

async function runCompanyCeoReport(): Promise<void> {
  const snap = await gatherCompanySnapshot();
  const content = digestMarkdown(snap);
  const reportId = crypto.randomUUID();

  await dbRun(
    `INSERT INTO ceo_reports (id, tenant_id, type, status, content_md, data_snapshot)
       VALUES (?, ?, 'company_daily', 'generated', ?, ?)`,
    reportId,
    COMPANY_TENANT_ID,
    content,
    JSON.stringify(snap),
  );

  const chatId = GROWTH_TELEGRAM_CHAT_ID;
  if (chatId) {
    try {
      await sendTelegramMessage(chatId, content);
      await dbRun(
        `UPDATE ceo_reports SET status = 'sent', sent_at = ? WHERE id = ?`,
        new Date().toISOString(),
        reportId,
      );
    } catch {
      // Delivery best-effort; the row persists as 'generated'.
    }
  }
}

export function registerFounderReportJobs(): void {
  registerJobHandler(COMPANY_CEO_REPORT_JOB, runCompanyCeoReport);
}
