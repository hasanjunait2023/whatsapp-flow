import { dbGet, dbRun } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { wahaClient, sessionNameForInstance } from "../waha/client.js";
import { logger } from "../lib/logger.js";
import { onInboundMessagePersisted, type InboundMessageEvent } from "./inbound-hooks.js";

/**
 * WhatsApp opt-out handler. Honoring STOP is both a ban-risk control (a high
 * block/complaint rate gets a number banned) and a legal requirement (GDPR /
 * India DPDPA / consumer law). We match the WHOLE trimmed message against a
 * keyword set (not a substring — "stop by my shop tomorrow" must not opt out),
 * flip contacts.opted_out, and send one confirmation. START re-subscribes.
 */

const OPT_OUT = new Set([
  "stop",
  "unsubscribe",
  "unsub",
  "cancel",
  "end",
  "quit",
  "remove",
  "optout",
  "opt out",
  "বন্ধ", // bondho (stop)
  "বাতিল", // batil (cancel)
  "আনসাবস্ক্রাইব",
]);

const OPT_IN = new Set(["start", "subscribe", "unstop", "resume", "চালু", "শুরু"]);

function classify(text: string | undefined): "out" | "in" | null {
  if (!text) return null;
  const norm = text.trim().toLowerCase().replace(/[.!]+$/, "");
  if (OPT_OUT.has(norm)) return "out";
  if (OPT_IN.has(norm)) return "in";
  return null;
}

interface ContactRow {
  id: string;
  wa_id: string;
  opted_out: boolean;
}

async function handleOptOut(event: InboundMessageEvent): Promise<void> {
  if (event.channel !== "whatsapp") return;
  const action = classify(event.text);
  if (!action) return;

  const contact = (await dbGet(
    "SELECT id, wa_id, opted_out FROM contacts WHERE id = ? LIMIT 1",
    event.contactId,
  )) as ContactRow | undefined;
  if (!contact) return;

  const optOut = action === "out";
  if (contact.opted_out === optOut) return; // already in the desired state

  await dbRun(
    "UPDATE contacts SET opted_out = ?, opted_out_at = ?, updated_at = ? WHERE id = ?",
    optOut,
    optOut ? new Date().toISOString() : null,
    new Date().toISOString(),
    contact.id,
  );
  emitChange("contacts", event.tenantId, { id: contact.id, opted_out: optOut });
  logger.info("opt_out_change", {
    tenant_id: event.tenantId,
    contact_id: contact.id,
    opted_out: optOut,
  });

  // Confirmation is a reactive reply (the contact just messaged us), so it is
  // allowed regardless of opt-out state. Best-effort — never throw into the hook.
  const reply = optOut
    ? "You've been unsubscribed and won't receive further messages. Reply START to resubscribe."
    : "You're resubscribed and will receive messages again. Reply STOP to unsubscribe.";
  try {
    await wahaClient.sendText({
      session: sessionNameForInstance(event.instanceId),
      chatId: contact.wa_id,
      text: reply,
    });
  } catch (err) {
    logger.warn("opt_out_confirm_failed", {
      contact_id: contact.id,
      msg_preview: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Registers the opt-out hook. Call once at startup. */
export function registerOptOutHandler(): void {
  onInboundMessagePersisted(handleOptOut);
}
