import { dbGet, dbRun, coerceJson } from "../../db/raw.js";
import { enqueueJob } from "../../jobs/queue.js";
import {
  sendTelegramApprovalCard,
  editTelegramMessage,
  escapeTelegramMarkdown,
} from "../telegram.js";
import { GROWTH_TELEGRAM_CHAT_ID } from "../../lib/env.js";

/**
 * The approval gate: every external growth action is queued here as a
 * growth_approvals row (status awaiting_approval) and an inline Approve/Reject
 * card is sent to the founder on Telegram. Nothing executes until the founder
 * taps Approve, at which point the execute job is enqueued.
 *
 * IDEMPOTENCY: Telegram redelivers webhooks and the job queue retries. Every
 * state transition is a guarded `UPDATE ... WHERE status = <expected>` with a
 * rowcount check, so a double-tap or a redelivered update is a safe no-op.
 */

export type ArtifactType =
  | "social_post"
  | "outreach_batch"
  | "ad"
  | "funnel_email"
  | "aftersales_touch"
  | "aftersales_template";

export type ApprovalStatus =
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "executed"
  | "failed"
  | "rejected"
  | "expired";

export interface ApprovalRow {
  id: string;
  artifact_type: string;
  artifact_id: string | null;
  summary: string;
  payload: unknown;
  status: string;
  execute_job_kind: string;
  tg_chat_id: string | null;
  tg_message_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
  reject_reason: string | null;
  execute_job_id: string | null;
  error: string | null;
  expires_at: string | null;
}

const DEFAULT_EXPIRY_MS = 48 * 60 * 60 * 1000;

export interface QueueApprovalInput {
  artifactType: ArtifactType;
  artifactId?: string;
  summary: string;
  payload: unknown;
  executeJobKind: string;
  expiresInMs?: number;
}

/**
 * Inserts an awaiting_approval row and sends the Telegram approval card. The
 * card's chat + message id are stored so the decision can later edit it. If the
 * card fails to send (or no chat is configured), the row still persists so it
 * surfaces in the founder report's pending list.
 */
export async function queueApproval(input: QueueApprovalInput): Promise<string> {
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + (input.expiresInMs ?? DEFAULT_EXPIRY_MS)).toISOString();

  await dbRun(
    `INSERT INTO growth_approvals
       (id, artifact_type, artifact_id, summary, payload, status, execute_job_kind, expires_at)
     VALUES (?, ?, ?, ?, ?, 'awaiting_approval', ?, ?)`,
    id,
    input.artifactType,
    input.artifactId ?? null,
    input.summary,
    JSON.stringify(input.payload),
    input.executeJobKind,
    expiresAt,
  );

  const chatId = GROWTH_TELEGRAM_CHAT_ID;
  if (chatId) {
    try {
      const card = await sendTelegramApprovalCard(chatId, cardMarkdown(input), id);
      await dbRun(
        `UPDATE growth_approvals SET tg_chat_id = ?, tg_message_id = ?, updated_at = ? WHERE id = ?`,
        chatId,
        String(card.message_id),
        new Date().toISOString(),
        id,
      );
    } catch {
      // Card delivery is best-effort; the row stays awaiting_approval and is
      // listed in the daily founder report so the action isn't silently lost.
    }
  }

  return id;
}

function cardMarkdown(input: QueueApprovalInput): string {
  // artifactType + summary are caller/AI-supplied; escape so they can't break
  // out of the Markdown message (inject formatting / unbalanced entities).
  return [
    `*Approval needed: ${escapeTelegramMarkdown(input.artifactType)}*`,
    "",
    escapeTelegramMarkdown(input.summary),
    "",
    "_Tap Approve to execute, or Reject to discard._",
  ].join("\n");
}

/**
 * Records the founder's decision. The guarded UPDATE only fires when the row is
 * still awaiting_approval, so a redelivered webhook or a double-tap returns
 * { changed: false } and does nothing. On approve, the execute job is enqueued
 * (dedupe-keyed on the approval id) and its id stored; the card is edited to a
 * confirmation either way.
 */
export async function decideApproval(
  approvalId: string,
  decision: "approve" | "reject",
  decidedBy: string,
): Promise<{ changed: boolean; status?: ApprovalStatus }> {
  const now = new Date().toISOString();
  const nextStatus: ApprovalStatus = decision === "approve" ? "approved" : "rejected";

  const res = await dbRun(
    `UPDATE growth_approvals
       SET status = ?, decided_by = ?, decided_at = ?, updated_at = ?
     WHERE id = ? AND status = 'awaiting_approval'`,
    nextStatus,
    decidedBy,
    now,
    now,
    approvalId,
  );

  if (res.changes !== 1) {
    // Already decided / expired / unknown id — idempotent no-op.
    return { changed: false };
  }

  const row = (await dbGet(
    `SELECT id, execute_job_kind, tg_chat_id, tg_message_id, summary FROM growth_approvals WHERE id = ?`,
    approvalId,
  )) as
    | { id: string; execute_job_kind: string; tg_chat_id: string | null; tg_message_id: string | null; summary: string }
    | undefined;

  if (!row) return { changed: true, status: nextStatus };

  if (decision === "approve") {
    const jobId = await enqueueJob({
      kind: row.execute_job_kind,
      payload: { approvalId },
      dedupeKey: `growth_execute:${approvalId}`,
    });
    await dbRun(
      `UPDATE growth_approvals SET execute_job_id = ?, updated_at = ? WHERE id = ?`,
      jobId,
      new Date().toISOString(),
      approvalId,
    );
  }

  const safeSummary = escapeTelegramMarkdown(row.summary);
  await editCard(
    row.tg_chat_id,
    row.tg_message_id,
    decision === "approve"
      ? `✅ *Approved* — ${safeSummary}\n\n_Executing…_`
      : `❌ *Rejected* — ${safeSummary}`,
  );

  return { changed: true, status: nextStatus };
}

async function editCard(
  chatId: string | null,
  messageId: string | null,
  markdown: string,
): Promise<void> {
  if (!chatId || !messageId) return;
  try {
    await editTelegramMessage(chatId, messageId, markdown);
  } catch {
    // Editing is cosmetic; never let a failed edit break the decision flow.
  }
}

/**
 * Claims an approval for execution. The guarded transition fires only from
 * 'approved' (the first run after the founder taps Approve) or 'executing' (a
 * queue retry of an in-flight attempt that crashed mid-run — the markApproval
 * helpers are idempotent, so re-running is safe). It will NOT fire from:
 *   - 'awaiting_approval'/'rejected'/'expired' — gate not open,
 *   - 'executed' (success) — no double-post,
 *   - 'failed' — a FAILED approval is terminal until a human re-approves it.
 * Dropping 'failed' from the claimable set means a failed publish is never
 * silently re-published by a queue retry; it surfaces in the founder digest
 * (which lists every non-terminal/failed status) and requires explicit
 * re-approval to retry. Returns null when the claim doesn't apply.
 */
export async function claimApprovalForExecution(
  approvalId: string,
): Promise<ApprovalRow | null> {
  const now = new Date().toISOString();
  const res = await dbRun(
    `UPDATE growth_approvals SET status = 'executing', updated_at = ?
     WHERE id = ? AND status IN ('approved', 'executing')`,
    now,
    approvalId,
  );
  if (res.changes !== 1) return null;

  const row = (await dbGet(
    `SELECT id, artifact_type, artifact_id, summary, payload, status, execute_job_kind,
            tg_chat_id, tg_message_id, decided_by, decided_at, reject_reason,
            execute_job_id, error, expires_at
       FROM growth_approvals WHERE id = ?`,
    approvalId,
  )) as ApprovalRow | undefined;
  if (!row) return null;
  return { ...row, payload: coerceJson(row.payload) };
}

/**
 * Stamps the terminal outcome of an execution and confirms it on the card. The
 * UPDATE is guarded to status = 'executing' (the state claimApprovalForExecution
 * leaves the row in) and treats changes !== 1 as a no-op: a redelivered retry
 * whose claim already advanced the row (e.g. to 'executed', or back to
 * 'executing' for a re-run) must not clobber that state with a stale outcome.
 */
export async function markApprovalExecuted(
  approvalId: string,
  ok: boolean,
  error?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const res = await dbRun(
    `UPDATE growth_approvals SET status = ?, error = ?, updated_at = ?
     WHERE id = ? AND status = 'executing'`,
    ok ? "executed" : "failed",
    ok ? null : (error ?? "execution failed"),
    now,
    approvalId,
  );
  if (res.changes !== 1) return; // row already advanced by another attempt — no-op

  const row = (await dbGet(
    `SELECT tg_chat_id, tg_message_id, summary FROM growth_approvals WHERE id = ?`,
    approvalId,
  )) as { tg_chat_id: string | null; tg_message_id: string | null; summary: string } | undefined;
  if (!row) return;

  // summary + error are caller/AI-supplied; escape before Markdown interpolation.
  const safeSummary = escapeTelegramMarkdown(row.summary);
  await editCard(
    row.tg_chat_id,
    row.tg_message_id,
    ok
      ? `✅ *Done* — ${safeSummary}`
      : `⚠️ *Failed* — ${safeSummary}\n\n${escapeTelegramMarkdown(error ?? "execution failed")}`,
  );
}

/** Expires awaiting_approval rows past their TTL. Run on an hourly tick. */
export async function expireStaleApprovals(): Promise<number> {
  const now = new Date().toISOString();
  const res = await dbRun(
    `UPDATE growth_approvals SET status = 'expired', updated_at = ?
     WHERE status = 'awaiting_approval' AND expires_at IS NOT NULL AND expires_at <= ?`,
    now,
    now,
  );
  return res.changes;
}
