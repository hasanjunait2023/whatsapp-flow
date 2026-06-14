import { dbGet } from "../db/raw.js";
import { registerJobHandler } from "../jobs/queue.js";
import { sendMessage } from "../routes/messaging.js";
import { renderMessage } from "../lib/spintax.js";
import { logger } from "../lib/logger.js";

/**
 * Drip bulk-send. Instead of looping sends inside one HTTP request (which would
 * block for minutes and time out behind nginx/Cloudflare — and blast at a
 * machine-uniform cadence), each recipient is enqueued as its own job with a
 * staggered run_at. The scheduler then drips them out one at a time. Each job
 * renders spintax + merge fields so every recipient gets a unique message
 * (identical bulk text is a WhatsApp ban signal). The per-number rate limit and
 * opt-out gate are enforced inside sendMessage.
 */

export const BULK_SEND_JOB = "bulk-send-contact";

export interface BulkSendPayload {
  tenantId: string;
  userId: string | null;
  contactId: string;
  content: string;
  instanceId?: string | null;
}

interface ContactNameRow {
  name: string | null;
  phone_number: string;
}

export function registerBulkSend(): void {
  registerJobHandler(BULK_SEND_JOB, async (raw) => {
    const p = raw as BulkSendPayload;
    const contact = (await dbGet(
      "SELECT name, phone_number FROM contacts WHERE id = ? AND tenant_id = ? LIMIT 1",
      p.contactId,
      p.tenantId,
    )) as ContactNameRow | undefined;
    if (!contact) return; // contact gone — nothing to do

    const content = renderMessage(p.content, {
      name: contact.name,
      phone_number: contact.phone_number,
    });

    const res = await sendMessage(
      { contact_id: p.contactId, content, content_type: "text", instance_id: p.instanceId ?? undefined },
      { userId: p.userId ?? "", tenantId: p.tenantId, isAdmin: false },
    );
    const data = res.data as { success?: boolean; code?: string } | undefined;
    if (!data?.success) {
      // Opt-out / rate-limit are expected outcomes, not errors — log, don't retry.
      logger.info("bulk_send_skipped", {
        tenant_id: p.tenantId,
        contact_id: p.contactId,
        code: data?.code,
      });
    }
  });
}
