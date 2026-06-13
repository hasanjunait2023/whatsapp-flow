import { dbGet, dbTx, type TxQuery } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import type { MappedMessage } from "./mapper.js";

/**
 * WAHA ingest pipeline — port of the Wasender webhook's contact upsert,
 * LID/phone reconciliation, dedup, thread-state denorm, and stats increments.
 * All writes for a single message run in ONE transaction so the inbox, thread
 * list, and stats stay consistent. SSE change events are emitted after the
 * transaction commits so the shim's filters fire.
 *
 * Dedup strategy (per plan):
 *  - UNIQUE messages.wa_message_id → ON CONFLICT DO NOTHING makes re-delivery a no-op.
 *  - For outbound device-sync, a 30s cross-contact content match reconciles
 *    CRM-sent echoes (the message we already inserted as `pending`) instead of
 *    creating a duplicate.
 */

export interface IngestInstance {
  id: string;
  tenant_id: string;
}

export type IngestResult =
  | { outcome: "inserted"; messageId: string; contactId: string; isNewContact: boolean }
  | { outcome: "duplicate"; messageId: string | null }
  | { outcome: "reconciled"; messageId: string }
  | { outcome: "skipped"; reason: string };

interface ContactRow {
  id: string;
  unread_count: number;
  name: string | null;
  phone_number: string | null;
  wa_id: string | null;
  profile_pic_synced_at: string | null;
}

const nowIso = (): string => new Date().toISOString();

async function findContact(
  tx: TxQuery,
  instanceId: string,
  by: "wa_id" | "phone_number",
  value: string,
): Promise<ContactRow | undefined> {
  return tx.get<ContactRow>(
    `SELECT id, unread_count, name, phone_number, wa_id, profile_pic_synced_at
     FROM contacts WHERE instance_id = ? AND ${by} = ? LIMIT 1`,
    instanceId,
    value,
  );
}

/** Resolves (or creates) the contact for an inbound message inside a tx. */
async function upsertInboundContact(
  tx: TxQuery,
  instance: IngestInstance,
  mapped: MappedMessage,
  pushName: string | null,
): Promise<{ contact: ContactRow; isNew: boolean }> {
  let contact = await findContact(tx, instance.id, "wa_id", mapped.waId);
  let isNew = false;

  if (contact) {
    const updates: string[] = ["last_message_at = ?"];
    const params: unknown[] = [nowIso()];
    if (pushName && (!contact.name || contact.name.endsWith("@lid"))) {
      updates.push("name = ?");
      params.push(pushName);
    }
    if (contact.phone_number?.includes("@lid") && mapped.phone && !mapped.phone.includes("@lid")) {
      updates.push("phone_number = ?");
      params.push(mapped.phone);
    }
    params.push(contact.id);
    await tx.run(`UPDATE contacts SET ${updates.join(", ")} WHERE id = ?`, ...params);
    return { contact, isNew };
  }

  // Reconcile by phone when the wa_id format changed (e.g. @lid ↔ @s.whatsapp.net).
  if (mapped.phone && !mapped.phone.includes("@lid")) {
    const byPhone = await findContact(tx, instance.id, "phone_number", mapped.phone);
    if (byPhone) {
      const updates: string[] = ["wa_id = ?", "last_message_at = ?"];
      const params: unknown[] = [mapped.waId, nowIso()];
      if (pushName && (!byPhone.name || byPhone.name.endsWith("@lid"))) {
        updates.push("name = ?");
        params.push(pushName);
      }
      params.push(byPhone.id);
      await tx.run(`UPDATE contacts SET ${updates.join(", ")} WHERE id = ?`, ...params);
      return { contact: byPhone, isNew };
    }
  }

  const id = crypto.randomUUID();
  await tx.run(
    `INSERT INTO contacts (id, tenant_id, instance_id, wa_id, phone_number, name, last_message_at, unread_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    id,
    instance.tenant_id,
    instance.id,
    mapped.waId,
    mapped.phone,
    pushName,
    nowIso(),
  );
  contact = {
    id,
    unread_count: 0,
    name: pushName,
    phone_number: mapped.phone,
    wa_id: mapped.waId,
    profile_pic_synced_at: null,
  };
  isNew = true;

  await tx.run(
    `INSERT INTO contact_thread_state
       (contact_id, tenant_id, contact_type, instance_id, contact_name, contact_phone,
        last_message_at, last_message_direction, unread_count, total_messages)
     VALUES (?, ?, 'whatsapp', ?, ?, ?, ?, 'inbound', 0, 0)`,
    contact.id,
    instance.tenant_id,
    instance.id,
    pushName,
    mapped.phone,
    nowIso(),
  );

  return { contact, isNew };
}

/**
 * UPSERT thread-state on message (port of update_thread_state_on_message RPC).
 * Named params were rewritten to positional `?` (Postgres has no named params),
 * and sqlite's scalar `MAX(a,b)` became Postgres `GREATEST(a,b)`.
 */
async function updateThreadState(
  tx: TxQuery,
  contactId: string,
  lastMessageAt: string,
  preview: string,
  direction: string,
  type: string,
  unreadDelta: number,
): Promise<void> {
  const ts = lastMessageAt;
  await tx.run(
    `UPDATE contact_thread_state SET
       last_message_at = GREATEST(last_message_at, ?),
       last_message_preview = CASE WHEN ? >= last_message_at THEN ? ELSE last_message_preview END,
       last_message_direction = CASE WHEN ? >= last_message_at THEN ? ELSE last_message_direction END,
       last_message_type = CASE WHEN ? >= last_message_at THEN ? ELSE last_message_type END,
       last_inbound_at = CASE
         WHEN ? = 'inbound' AND ? >= COALESCE(last_inbound_at, '1970-01-01T00:00:00.000Z')
         THEN ? ELSE last_inbound_at END,
       unread_count = unread_count + ?,
       total_messages = total_messages + 1,
       updated_at = ?
     WHERE contact_id = ?`,
    ts, // last_message_at = GREATEST(., ?)
    ts,
    preview, // preview CASE
    ts,
    direction, // direction CASE
    ts,
    type, // type CASE
    direction,
    ts,
    ts, // last_inbound_at CASE (dir, ts, ts)
    unreadDelta,
    nowIso(),
    contactId,
  );
}

/** Daily-stats increment (port of increment_daily_stats RPC). */
async function incrementDailyStats(
  tx: TxQuery,
  tenantId: string,
  direction: "inbound" | "outbound",
  isNewConversation: boolean,
): Promise<void> {
  const statDate = nowIso().slice(0, 10);
  const inbound = direction === "inbound" ? 1 : 0;
  const outbound = direction === "outbound" ? 1 : 0;
  const newConv = isNewConversation ? 1 : 0;
  await tx.run(
    `INSERT INTO tenant_daily_stats
       (tenant_id, stat_date, inbound_count, outbound_count, new_conversations, wa_inbound, wa_outbound)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (tenant_id, stat_date) DO UPDATE SET
       inbound_count = tenant_daily_stats.inbound_count + ?,
       outbound_count = tenant_daily_stats.outbound_count + ?,
       new_conversations = tenant_daily_stats.new_conversations + ?,
       wa_inbound = tenant_daily_stats.wa_inbound + ?,
       wa_outbound = tenant_daily_stats.wa_outbound + ?,
       updated_at = ?`,
    tenantId,
    statDate,
    inbound,
    outbound,
    newConv,
    inbound,
    outbound, // VALUES
    inbound,
    outbound,
    newConv,
    inbound,
    outbound, // DO UPDATE increments
    nowIso(),
  );
}

/** Usage-counter increment (port of increment_usage_counter RPC). */
async function incrementUsageCounter(
  tx: TxQuery,
  tenantId: string,
  field: "messages_received" | "messages_sent",
  amount: number,
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  await tx.run(
    `INSERT INTO usage_counters (id, tenant_id, period_start, period_end, ${field})
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (tenant_id, period_start) DO UPDATE SET
       ${field} = usage_counters.${field} + ?,
       updated_at = ?`,
    crypto.randomUUID(),
    tenantId,
    periodStart,
    periodEnd,
    amount,
    amount,
    nowIso(),
  );
}

async function messageExists(waMessageId: string): Promise<boolean> {
  const row = await dbGet("SELECT 1 FROM messages WHERE wa_message_id = ? LIMIT 1", waMessageId);
  return row !== undefined;
}

/**
 * Ingests an inbound message. Pre-downloaded media path is passed in (download
 * happens outside the tx since it is async). Returns the outcome and emits SSE
 * after commit.
 */
export async function ingestInbound(
  instance: IngestInstance,
  mapped: MappedMessage,
  pushName: string | null,
  localMediaPath: string | null,
): Promise<IngestResult> {
  if (mapped.waMessageId && (await messageExists(mapped.waMessageId))) {
    return { outcome: "duplicate", messageId: mapped.waMessageId };
  }

  const result = await dbTx<IngestResult>(async (tx): Promise<IngestResult> => {
    const { contact, isNew } = await upsertInboundContact(tx, instance, mapped, pushName);
    const messageId = crypto.randomUUID();

    const info = await tx.run(
      `INSERT INTO messages
         (id, tenant_id, instance_id, contact_id, wa_message_id, direction, status,
          content_type, content, media_url, media_mime_type, media_filename,
          location_lat, location_lng, sent_at)
       VALUES (?, ?, ?, ?, ?, 'inbound', 'delivered', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
      messageId,
      instance.tenant_id,
      instance.id,
      contact.id,
      mapped.waMessageId,
      mapped.contentType,
      mapped.content,
      localMediaPath,
      mapped.mediaMimeType,
      mapped.mediaFilename,
      mapped.locationLat,
      mapped.locationLng,
      mapped.sentAt,
    );

    if (info.changes === 0) {
      // Lost a race on the UNIQUE wa_message_id — treat as duplicate.
      return { outcome: "duplicate", messageId: mapped.waMessageId };
    }

    await tx.run(
      "UPDATE contacts SET unread_count = unread_count + 1, last_message_at = ? WHERE id = ?",
      nowIso(),
      contact.id,
    );

    const preview = mapped.content
      ? mapped.content.slice(0, 100)
      : mapped.contentType !== "text"
        ? `[${mapped.contentType}]`
        : "";
    await updateThreadState(tx, contact.id, mapped.sentAt, preview, "inbound", mapped.contentType, 1);
    await incrementDailyStats(tx, instance.tenant_id, "inbound", isNew);
    await incrementUsageCounter(tx, instance.tenant_id, "messages_received", 1);

    return { outcome: "inserted", messageId, contactId: contact.id, isNewContact: isNew };
  });

  if (result.outcome === "inserted") {
    emitChange("messages", instance.tenant_id, { contact_id: result.contactId });
    emitChange("contact_thread_state", instance.tenant_id, { contact_id: result.contactId });
    emitChange("contacts", instance.tenant_id, { id: result.contactId });
  }
  return result;
}

/**
 * Handles a fromMe message (sent from the linked phone / WhatsApp Web, or the
 * echo of a CRM-sent message). Reconciles against a recently-created `pending`
 * outbound row within 30s instead of inserting a duplicate.
 */
export async function ingestOutboundSync(
  instance: IngestInstance,
  mapped: MappedMessage,
  localMediaPath: string | null,
): Promise<IngestResult> {
  if (mapped.isGroup) {
    return { outcome: "skipped", reason: "group" };
  }
  if (mapped.waMessageId && (await messageExists(mapped.waMessageId))) {
    return { outcome: "duplicate", messageId: mapped.waMessageId };
  }

  const result = await dbTx<IngestResult>(async (tx): Promise<IngestResult> => {
    // Resolve/create the contact (phone reconciliation, no unread bump).
    let contact = await findContact(tx, instance.id, "wa_id", mapped.waId);
    if (!contact && mapped.phone) {
      const byPhone = await findContact(tx, instance.id, "phone_number", mapped.phone);
      if (byPhone) {
        await tx.run("UPDATE contacts SET wa_id = ? WHERE id = ?", mapped.waId, byPhone.id);
        contact = byPhone;
      }
    }
    if (!contact) {
      const id = crypto.randomUUID();
      await tx.run(
        `INSERT INTO contacts (id, tenant_id, instance_id, wa_id, phone_number, last_message_at, unread_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        id,
        instance.tenant_id,
        instance.id,
        mapped.waId,
        mapped.phone,
        nowIso(),
      );
      await tx.run(
        `INSERT INTO contact_thread_state
           (contact_id, tenant_id, contact_type, instance_id, contact_phone, last_message_at, last_message_direction)
         VALUES (?, ?, 'whatsapp', ?, ?, ?, 'outbound')`,
        id,
        instance.tenant_id,
        instance.id,
        mapped.phone,
        nowIso(),
      );
      contact = {
        id,
        unread_count: 0,
        name: null,
        phone_number: mapped.phone,
        wa_id: mapped.waId,
        profile_pic_synced_at: null,
      };
    }

    // 30s cross-contact dedup: find a recent CRM-sent row to reconcile.
    const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
    const relatedIds = (
      await tx.all<{ id: string }>(
        "SELECT id FROM contacts WHERE instance_id = ? AND phone_number = ?",
        instance.id,
        mapped.phone,
      )
    ).map((r) => r.id);
    const contactIds = relatedIds.length > 0 ? relatedIds : [contact.id];
    const placeholders = contactIds.map(() => "?").join(",");

    const contentClause = mapped.contentType === "text" && mapped.content ? "AND content = ?" : "";
    const params: unknown[] = [...contactIds, mapped.contentType, thirtySecondsAgo];
    if (contentClause) params.push(mapped.content);

    const recentDuplicate = await tx.get<{ id: string; wa_message_id: string | null }>(
      `SELECT id, wa_message_id FROM messages
       WHERE contact_id IN (${placeholders})
         AND direction = 'outbound'
         AND content_type = ?
         AND status IN ('pending','sent','delivered')
         AND (is_synced_from_device IS NOT TRUE)
         AND created_at >= ?
         ${contentClause}
       ORDER BY created_at DESC LIMIT 1`,
      ...params,
    );

    if (recentDuplicate) {
      if (mapped.waMessageId && !recentDuplicate.wa_message_id) {
        await tx.run(
          "UPDATE messages SET wa_message_id = ?, status = 'sent', sent_at = ? WHERE id = ?",
          mapped.waMessageId,
          mapped.sentAt,
          recentDuplicate.id,
        );
      }
      return { outcome: "reconciled", messageId: recentDuplicate.id };
    }

    const messageId = crypto.randomUUID();
    const info = await tx.run(
      `INSERT INTO messages
         (id, tenant_id, instance_id, contact_id, wa_message_id, direction, status,
          content_type, content, media_url, media_mime_type, media_filename,
          location_lat, location_lng, sent_at, is_synced_from_device)
       VALUES (?, ?, ?, ?, ?, 'outbound', 'sent', ?, ?, ?, ?, ?, ?, ?, ?, true)
       ON CONFLICT DO NOTHING`,
      messageId,
      instance.tenant_id,
      instance.id,
      contact.id,
      mapped.waMessageId,
      mapped.contentType,
      mapped.content,
      localMediaPath,
      mapped.mediaMimeType,
      mapped.mediaFilename,
      mapped.locationLat,
      mapped.locationLng,
      mapped.sentAt,
    );
    if (info.changes === 0) {
      return { outcome: "duplicate", messageId: mapped.waMessageId };
    }

    await tx.run("UPDATE contacts SET last_message_at = ? WHERE id = ?", nowIso(), contact.id);
    const preview = mapped.content
      ? mapped.content.slice(0, 100)
      : mapped.contentType !== "text"
        ? `[${mapped.contentType}]`
        : "";
    await updateThreadState(tx, contact.id, mapped.sentAt, preview, "outbound", mapped.contentType, 0);
    await incrementUsageCounter(tx, instance.tenant_id, "messages_sent", 1);

    return { outcome: "inserted", messageId, contactId: contact.id, isNewContact: false };
  });

  if (result.outcome === "inserted" || result.outcome === "reconciled") {
    emitChange("messages", instance.tenant_id, {});
    emitChange("contact_thread_state", instance.tenant_id, {});
  }
  return result;
}
