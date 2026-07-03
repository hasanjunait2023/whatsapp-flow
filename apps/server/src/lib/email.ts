import { RESEND_API_KEY, EMAIL_FROM } from "./env.js";
import { logger } from "./logger.js";

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send a transactional email via the Resend REST API (no SDK dep needed).
 * Falls back to a console warning when RESEND_API_KEY is unset so the
 * development flow doesn't require real credentials.
 */
export async function sendEmail(opts: SendEmailOpts): Promise<void> {
  if (!RESEND_API_KEY) {
    logger.warn("email_send_skipped", {
      reason: "RESEND_API_KEY not configured",
      to: opts.to,
      subject: opts.subject,
    });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    logger.error("email_send_failed", { status: res.status, body });
    throw new Error(`Email send failed: ${res.status}`);
  }
}
