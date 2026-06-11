import { startTelegramLink, unlinkTelegram, linkStatus } from "../services/telegram.js";
import { enqueueCeoReport } from "../services/ceo/index.js";
import type { ReportType } from "../services/ceo/report.js";
import type { FnContext, FnResult } from "./waha/session.js";

/** CEO agent + Telegram-link fn handlers, spread into the /api/fn registry. */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

function fail(message: string): FnResult {
  return { data: null, error: { message } };
}

const REPORT_TYPES = new Set<string>(["daily", "weekly", "marketing_ideas", "adhoc"]);

export const CEO_HANDLERS: Record<string, FnHandler> = {
  "telegram-link-start": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    try {
      return { data: startTelegramLink(ctx.tenantId, ctx.userId), error: null };
    } catch (err) {
      return fail(err instanceof Error ? err.message : "link failed to start");
    }
  },

  "telegram-unlink": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    unlinkTelegram(ctx.tenantId, ctx.userId);
    return { data: { success: true }, error: null };
  },

  "telegram-link-status": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    return { data: linkStatus(ctx.tenantId, ctx.userId), error: null };
  },

  "ceo-run-now": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const type = typeof body.type === "string" ? body.type : "adhoc";
    if (!REPORT_TYPES.has(type)) return fail(`Unknown report type "${type}"`);
    const jobId = enqueueCeoReport(ctx.tenantId, type as ReportType);
    return { data: { job_id: jobId, status: "queued" }, error: null };
  },
};
