import { sqlite } from "../../db/index.js";
import { emitChange } from "../../realtime/emitter.js";
import { wahaClient, sessionNameForInstance } from "../../waha/client.js";

/**
 * Bulk group-add worker (HIGH ban-risk feature). Adds members to WhatsApp groups
 * in small batches paced by an interval, hard-capped by a per-tenant DAILY limit.
 * These guardrails are the whole point: auto-adding strangers to groups is the
 * fastest way to get a number banned, so the worker NEVER exceeds batch_size per
 * run, waits interval_minutes between batches, and stops at the daily cap.
 *
 * One batch per due queue per invocation; scheduled_for is pushed forward by the
 * interval after each batch so the next batch only runs once the interval lapses.
 */

const DEFAULT_BATCH = 5;
const DEFAULT_INTERVAL_MIN = 30;
const DEFAULT_DAILY_LIMIT = 50;

interface QueueRow {
  id: string;
  tenant_id: string;
  group_id: string;
  phone_numbers: string;
  batch_size: number | null;
  interval_minutes: number | null;
  processed_count: number | null;
  failed_count: number | null;
  error_log: string | null;
  status: string;
}

interface GroupRow {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_group_id: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Remaining members the tenant may add today (creates the row lazily). */
function remainingDailyQuota(tenantId: string): { remaining: number; limit: number; added: number } {
  const row = sqlite
    .prepare("SELECT max_daily_limit, members_added FROM tenant_daily_group_limits WHERE tenant_id = ? AND date = ?")
    .get(tenantId, today()) as { max_daily_limit: number | null; members_added: number | null } | undefined;
  const limit = row?.max_daily_limit ?? DEFAULT_DAILY_LIMIT;
  const added = row?.members_added ?? 0;
  return { remaining: Math.max(0, limit - added), limit, added };
}

function bumpDailyQuota(tenantId: string, n: number): void {
  sqlite
    .prepare(
      `INSERT INTO tenant_daily_group_limits (id, tenant_id, date, max_daily_limit, members_added)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(tenant_id, date) DO UPDATE SET members_added = members_added + excluded.members_added`,
    )
    .run(crypto.randomUUID(), tenantId, today(), DEFAULT_DAILY_LIMIT, n);
}

function toJid(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@c.us`;
}

async function processOne(q: QueueRow): Promise<void> {
  const phones: string[] = (() => {
    try {
      const parsed = JSON.parse(q.phone_numbers);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  })();
  const processed = q.processed_count ?? 0;
  if (processed >= phones.length) {
    sqlite
      .prepare("UPDATE group_add_queue SET status = 'completed', completed_at = ? WHERE id = ?")
      .run(new Date().toISOString(), q.id);
    emitChange("group_add_queue", q.tenant_id, { id: q.id });
    return;
  }

  const group = sqlite
    .prepare("SELECT id, tenant_id, instance_id, wa_group_id FROM whatsapp_groups WHERE id = ? AND tenant_id = ? LIMIT 1")
    .get(q.group_id, q.tenant_id) as GroupRow | undefined;
  if (!group) {
    appendError(q.id, "Group not found; cancelling queue");
    sqlite.prepare("UPDATE group_add_queue SET status = 'cancelled' WHERE id = ?").run(q.id);
    return;
  }

  const { remaining } = remainingDailyQuota(q.tenant_id);
  if (remaining <= 0) {
    // Daily cap hit — leave pending and try again after the interval (tomorrow).
    pushSchedule(q);
    return;
  }

  const batchSize = Math.max(1, q.batch_size ?? DEFAULT_BATCH);
  const take = Math.min(batchSize, remaining, phones.length - processed);
  const batch = phones.slice(processed, processed + take);
  const session = sessionNameForInstance(group.instance_id);

  let added = 0;
  let failed = 0;
  try {
    await wahaClient.addGroupParticipants(session, group.wa_group_id, batch.map(toJid));
    const now = new Date().toISOString();
    const ins = sqlite.prepare(
      `INSERT OR IGNORE INTO whatsapp_group_participants (id, group_id, tenant_id, phone_number, is_admin, added_at)
       VALUES (?, ?, ?, ?, 0, ?)`,
    );
    for (const phone of batch) ins.run(crypto.randomUUID(), group.id, group.tenant_id, phone.replace(/[^0-9]/g, ""), now);
    added = batch.length;
  } catch (err) {
    failed = batch.length;
    appendError(q.id, err instanceof Error ? err.message : "Batch add failed");
  }

  if (added > 0) bumpDailyQuota(q.tenant_id, added);

  const newProcessed = processed + added + failed;
  const done = newProcessed >= phones.length;
  sqlite
    .prepare(
      `UPDATE group_add_queue
         SET processed_count = ?, failed_count = ?, status = ?, completed_at = ?
       WHERE id = ?`,
    )
    .run(
      newProcessed,
      (q.failed_count ?? 0) + failed,
      done ? "completed" : "processing",
      done ? new Date().toISOString() : null,
      q.id,
    );
  if (!done) pushSchedule(q);
  emitChange("group_add_queue", q.tenant_id, { id: q.id });
}

/** Push the next batch's scheduled_for forward by the queue's interval. */
function pushSchedule(q: QueueRow): void {
  const intervalMin = Math.max(1, q.interval_minutes ?? DEFAULT_INTERVAL_MIN);
  const next = new Date(Date.now() + intervalMin * 60 * 1000).toISOString();
  sqlite.prepare("UPDATE group_add_queue SET scheduled_for = ? WHERE id = ?").run(next, q.id);
}

function appendError(queueId: string, message: string): void {
  const row = sqlite.prepare("SELECT error_log FROM group_add_queue WHERE id = ?").get(queueId) as
    | { error_log: string | null }
    | undefined;
  let log: unknown[] = [];
  try {
    log = row?.error_log ? JSON.parse(row.error_log) : [];
  } catch {
    log = [];
  }
  log.push({ at: new Date().toISOString(), message });
  sqlite.prepare("UPDATE group_add_queue SET error_log = ? WHERE id = ?").run(JSON.stringify(log.slice(-20)), queueId);
}

/**
 * Processes one due batch for every active queue (optionally a single tenant).
 * Called on a scheduler tick and by the group-batch-processor fn.
 */
export async function processGroupAddQueue(tenantId?: string): Promise<{ processed: number }> {
  const now = new Date().toISOString();
  const rows = sqlite
    .prepare(
      `SELECT id, tenant_id, group_id, phone_numbers, batch_size, interval_minutes,
              processed_count, failed_count, error_log, status
         FROM group_add_queue
        WHERE status IN ('pending','processing') AND scheduled_for <= ?
          ${tenantId ? "AND tenant_id = ?" : ""}`,
    )
    .all(...(tenantId ? [now, tenantId] : [now])) as QueueRow[];

  for (const q of rows) {
    try {
      await processOne(q);
    } catch {
      // Per-queue failures are recorded on the row; continue the sweep.
    }
  }
  return { processed: rows.length };
}
