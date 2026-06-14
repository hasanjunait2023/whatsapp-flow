import { createHash } from "node:crypto";
import { dbRun } from "../db/raw.js";
import { logger } from "./logger.js";
import { sendTelegramMessage } from "../services/telegram.js";
import { OPS_TELEGRAM_CHAT_ID } from "./env.js";

/**
 * Self-hosted error sink (chosen over Sentry to avoid an external vendor/DSN).
 * captureError() persists to the error_logs table and fires a throttled Telegram
 * alert to the ops chat. Best-effort: it never throws — a failure to record an
 * error must not cascade into the request that triggered it.
 */

export interface ErrorContext {
  source?: "backend" | "frontend";
  severity?: "error" | "warn" | "fatal";
  tenantId?: string | null;
  userId?: string | null;
  url?: string | null;
  requestId?: string | null;
  /** Small structured extras (route, fn name, status). No PII / message bodies. */
  meta?: Record<string, unknown>;
}

/** In-process alert throttle: one Telegram ping per fingerprint per window. */
const ALERT_WINDOW_MS = 10 * 60 * 1000;
const lastAlertAt = new Map<string, number>();

function fingerprint(message: string, stack?: string | null): string {
  // First stack frame keeps the fingerprint stable across varying messages.
  const frame = (stack ?? "").split("\n").find((l) => l.includes("at ")) ?? "";
  return createHash("sha256").update(`${message}|${frame}`).digest("hex").slice(0, 16);
}

export async function captureError(
  err: unknown,
  ctx: ErrorContext = {},
): Promise<void> {
  try {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;
    const fp = fingerprint(message, stack);
    const severity = ctx.severity ?? "error";
    const source = ctx.source ?? "backend";

    await dbRun(
      `INSERT INTO error_logs
         (id, source, severity, fingerprint, message, stack, tenant_id, user_id, url, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      source,
      severity,
      fp,
      message.slice(0, 2000),
      stack ? stack.slice(0, 8000) : null,
      ctx.tenantId ?? null,
      ctx.userId ?? null,
      ctx.url ?? null,
      ctx.meta ? JSON.stringify(ctx.meta) : null,
      new Date().toISOString(),
    );

    logger.error("captured_error", {
      source,
      severity,
      fingerprint: fp,
      tenant_id: ctx.tenantId ?? undefined,
      request_id: ctx.requestId ?? undefined,
      msg_preview: message.slice(0, 200),
    });

    void maybeAlert(fp, source, severity, message, ctx);
  } catch (sinkErr) {
    // The sink itself failed (e.g. DB down). Fall back to the log only.
    logger.error("error_sink_failed", {
      msg_preview: sinkErr instanceof Error ? sinkErr.message : String(sinkErr),
    });
  }
}

async function maybeAlert(
  fp: string,
  source: string,
  severity: string,
  message: string,
  ctx: ErrorContext,
): Promise<void> {
  if (!OPS_TELEGRAM_CHAT_ID) return;
  const now = Date.now();
  const last = lastAlertAt.get(fp) ?? 0;
  if (now - last < ALERT_WINDOW_MS) return;
  lastAlertAt.set(fp, now);
  const where = ctx.url ? `\n\`${ctx.url}\`` : "";
  const text =
    `🔴 *${severity.toUpperCase()}* (${source})\n` +
    `${message.slice(0, 300)}${where}\n` +
    `fp: \`${fp}\`${ctx.tenantId ? ` tenant: \`${ctx.tenantId}\`` : ""}`;
  try {
    await sendTelegramMessage(OPS_TELEGRAM_CHAT_ID, text);
  } catch {
    // Alerting is best-effort; the row is already persisted.
  }
}
