import { sqlite } from "../db/index.js";
import { sendMessage } from "../routes/messaging.js";

/**
 * whatsapp-followup-cron port. Processes due rows in whatsapp_followup_queue:
 * skips contacts who have since ordered or replied, then sends the tenant's
 * configured follow-up message + media via the shared send-message path.
 *
 * Gated by the global system_settings flag `whatsapp_followup_enabled` so an
 * admin can disable the whole feature, exactly like the Supabase original.
 */

const BATCH_LIMIT = 50;

interface QueueItem {
  id: string;
  tenant_id: string;
  contact_id: string;
  instance_id: string;
  created_at: string;
}

interface MediaItem {
  type: string;
  url: string;
  filename: string;
  caption?: string;
}

function followupEnabled(): boolean {
  const row = sqlite
    .prepare("SELECT value FROM system_settings WHERE key = 'whatsapp_followup_enabled' LIMIT 1")
    .get() as { value: unknown } | undefined;
  if (!row) return false;
  const value = typeof row.value === "string" ? safeJson(row.value) : row.value;
  if (value === true) return true;
  return !!(value && typeof value === "object" && (value as { value?: unknown }).value === true);
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function setStatus(id: string, status: string, skipReason?: string): void {
  if (skipReason) {
    sqlite.prepare("UPDATE whatsapp_followup_queue SET status = ?, skip_reason = ? WHERE id = ?").run(status, skipReason, id);
  } else {
    sqlite.prepare("UPDATE whatsapp_followup_queue SET status = ? WHERE id = ?").run(status, id);
  }
}

export interface FollowupResult {
  processed: number;
  sent: number;
  skipped: number;
}

/** whatsapp-followup-cron: send due follow-ups, skipping replied/ordered contacts. */
export async function runWhatsappFollowups(): Promise<FollowupResult> {
  if (!followupEnabled()) return { processed: 0, sent: 0, skipped: 0 };

  const due = sqlite
    .prepare(
      `SELECT id, tenant_id, contact_id, instance_id, created_at FROM whatsapp_followup_queue
       WHERE status = 'pending' AND scheduled_for <= ? LIMIT ?`,
    )
    .all(new Date().toISOString(), BATCH_LIMIT) as QueueItem[];

  let processed = 0;
  let sent = 0;
  let skipped = 0;

  for (const item of due) {
    processed += 1;
    // Skip if the contact ordered. Orders are scoped to the queue row's tenant.
    const ordered = sqlite
      .prepare(
        `SELECT 1 FROM orders WHERE contact_id = ? AND tenant_id = ?
           AND status IN ('confirmed','processing','shipped','delivered','completed') LIMIT 1`,
      )
      .get(item.contact_id, item.tenant_id);
    if (ordered) {
      setStatus(item.id, "skipped", "order_placed");
      skipped += 1;
      continue;
    }

    // Skip if the contact replied since the queue row was created.
    const replied = sqlite
      .prepare(
        "SELECT 1 FROM messages WHERE contact_id = ? AND tenant_id = ? AND direction = 'inbound' AND created_at > ? LIMIT 1",
      )
      .get(item.contact_id, item.tenant_id, item.created_at);
    if (replied) {
      setStatus(item.id, "skipped", "customer_replied");
      skipped += 1;
      continue;
    }

    const settings = sqlite
      .prepare("SELECT followup_message, followup_media_items FROM whatsapp_auto_messages WHERE tenant_id = ? LIMIT 1")
      .get(item.tenant_id) as { followup_message: string | null; followup_media_items: unknown } | undefined;
    if (!settings?.followup_message) {
      setStatus(item.id, "skipped", "no_message_configured");
      skipped += 1;
      continue;
    }

    // System-internal send, scoped to the queue row's tenant (no cross-tenant access).
    const ctx = { userId: "system", tenantId: item.tenant_id, isAdmin: false };
    await sendMessage(
      { contact_id: item.contact_id, instance_id: item.instance_id, content: settings.followup_message, content_type: "text" },
      ctx,
    );

    const media = parseMedia(settings.followup_media_items);
    for (const m of media) {
      await sendMessage(
        {
          contact_id: item.contact_id,
          instance_id: item.instance_id,
          content: m.caption ?? "",
          content_type: m.type,
          media_url: m.url,
          media_filename: m.filename,
        },
        ctx,
      );
    }

    sqlite
      .prepare("INSERT INTO whatsapp_auto_message_log (id, tenant_id, contact_id, message_type, sent_at) VALUES (?, ?, ?, 'followup', ?)")
      .run(crypto.randomUUID(), item.tenant_id, item.contact_id, new Date().toISOString());
    setStatus(item.id, "sent");
    sent += 1;
  }

  return { processed, sent, skipped };
}

function parseMedia(raw: unknown): MediaItem[] {
  const parsed = typeof raw === "string" ? safeJson(raw) : raw;
  return Array.isArray(parsed) ? (parsed as MediaItem[]) : [];
}
