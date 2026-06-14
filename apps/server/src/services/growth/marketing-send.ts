import { dbGet, dbRun } from "../../db/raw.js";
import { registerJobHandler } from "../../jobs/queue.js";
import { wahaClient } from "../../waha/client.js";
import { GROWTH_WHATSAPP_SESSION } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import {
  claimApprovalForExecution,
  markApprovalExecuted,
} from "./approvals.js";

/**
 * Execution job for an approved funnel message (M3). The approval gate enqueues
 * this (kind SEND_MARKETING_MESSAGE_JOB) only after the founder taps Approve.
 *
 * Routing:
 *   - whatsapp: send via wahaClient.sendText, but ONLY when the lead actually
 *     submitted a whatsapp_number (the form is the consent signal). No number =>
 *     no warm channel => skip the send and record it.
 *   - email: STUBBED. There is no email infrastructure in this repo (no SMTP /
 *     Resend / nodemailer). emailSend() logs the intended send, records the row
 *     as pending, and flags the gap. Wiring a real provider is a follow-up.
 *
 * IDEMPOTENCY: claimApprovalForExecution() guards approved -> executing so a
 * queue retry that re-runs the handler returns early.
 */

export const SEND_MARKETING_MESSAGE_JOB = "send_marketing_message";

interface SendJobPayload {
  approvalId: string;
}

interface MarketingSendPayload {
  channel: "whatsapp" | "email";
  enrollmentId: string;
  sequenceStep: number;
  leadId: string;
  to: string;
  content: { subject: string; subjectBn: string; body: string; bodyBn: string };
}

/** Build the bilingual WhatsApp body: English line then Bangla line. */
function renderWhatsappText(content: MarketingSendPayload["content"]): string {
  return `${content.body}\n\n${content.bodyBn}`;
}

/** Digits-only JID for WAHA, matching the existing group/messaging convention. */
function toChatId(whatsappNumber: string): string {
  return `${whatsappNumber.replace(/[^0-9]/g, "")}@c.us`;
}

/**
 * STUBBED email sender. No provider exists in this repo, so we cannot actually
 * deliver email. We log the intended send and report it as not-delivered so the
 * caller records the send row as 'pending' (awaiting real infra) rather than
 * 'sent'. Returns false to signal "not delivered".
 *
 * EMAIL-INFRA GAP: wire SMTP or an API provider (Resend/Postmark/SES) here and
 * return true on success. Required secret: e.g. RESEND_API_KEY (not yet defined).
 */
async function emailSend(to: string, content: MarketingSendPayload["content"]): Promise<boolean> {
  logger.warn("marketing_email_stubbed", {
    code: "EMAIL_INFRA_MISSING",
    to_present: Boolean(to),
    subject_preview: content.subject.slice(0, 60),
  });
  return false;
}

/** Records the send attempt in admin_marketing_sends. */
async function recordSend(opts: {
  enrollmentId: string;
  sequenceStep: number;
  channel: string;
  status: "sent" | "pending" | "failed";
  content: MarketingSendPayload["content"];
  error?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO admin_marketing_sends
       (id, enrollment_id, sequence_id, channel, content, status, sent_at, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    opts.enrollmentId,
    String(opts.sequenceStep),
    opts.channel,
    JSON.stringify(opts.content),
    opts.status,
    opts.status === "sent" ? now : null,
    opts.error ?? null,
    now,
  );
}

/** Bump the enrollment's monthly counter after a real send. */
async function advanceEnrollmentCounters(enrollmentId: string): Promise<void> {
  await dbRun(
    `UPDATE admin_marketing_enrollments
        SET messages_this_month = messages_this_month + 1, last_message_at = ?
      WHERE id = ?`,
    new Date().toISOString(),
    enrollmentId,
  );
}

async function runSendMarketingMessage(payload: unknown): Promise<void> {
  const { approvalId } = payload as SendJobPayload;

  const approval = await claimApprovalForExecution(approvalId);
  if (!approval) return; // not approved, or already claimed by another attempt

  const data = approval.payload as MarketingSendPayload;

  try {
    if (data.channel === "whatsapp") {
      // Warm-only: send ONLY when the lead supplied a whatsapp_number. The
      // payload's `to` is that number; an empty/blank one means no consent
      // signal — record without sending so we never cold-message a number.
      const number = (data.to ?? "").trim();
      if (!number) {
        await recordSend({
          enrollmentId: data.enrollmentId,
          sequenceStep: data.sequenceStep,
          channel: "whatsapp",
          status: "failed",
          content: data.content,
          error: "no whatsapp_number on lead (not consented)",
        });
        await markApprovalExecuted(approvalId, true);
        return;
      }

      await wahaClient.sendText({
        session: GROWTH_WHATSAPP_SESSION,
        chatId: toChatId(number),
        text: renderWhatsappText(data.content),
      });
      await recordSend({
        enrollmentId: data.enrollmentId,
        sequenceStep: data.sequenceStep,
        channel: "whatsapp",
        status: "sent",
        content: data.content,
      });
      await advanceEnrollmentCounters(data.enrollmentId);
    } else {
      // Email path: stubbed (no infra). Records 'pending' and does NOT bump the
      // delivered counter, since nothing was actually delivered.
      const delivered = await emailSend(data.to, data.content);
      await recordSend({
        enrollmentId: data.enrollmentId,
        sequenceStep: data.sequenceStep,
        channel: "email",
        status: delivered ? "sent" : "pending",
        content: data.content,
        error: delivered ? undefined : "email infrastructure not configured (stub)",
      });
      if (delivered) await advanceEnrollmentCounters(data.enrollmentId);
    }

    await markApprovalExecuted(approvalId, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : "marketing send failed";
    await recordSend({
      enrollmentId: data.enrollmentId,
      sequenceStep: data.sequenceStep,
      channel: data.channel,
      status: "failed",
      content: data.content,
      error: message,
    });
    await markApprovalExecuted(approvalId, false, message);
    // Rethrow so the queue retries. The claim guard makes the retry safe: it
    // will not re-run unless the row is moved back to 'approved'.
    throw err;
  }
}

export function registerMarketingSendJob(): void {
  registerJobHandler(SEND_MARKETING_MESSAGE_JOB, runSendMarketingMessage);
}
