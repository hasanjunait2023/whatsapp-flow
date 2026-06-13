import { dbGet, dbAll, dbRun, coerceJson } from "../../db/raw.js";
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
async function remainingDailyQuota(
  tenantId: string,
): Promise<{ remaining: number; limit: number; added: number }> {
  const row = await dbGet<{ max_daily_limit: number | null; members_added: number | null }>(
    "SELECT max_daily_limit, members_added FROM tenant_daily_group_limits WHERE tenant_id = ? AND date = ?",
    tenantId,
    today(),
  );
  const limit = row?.max_daily_limit ?? DEFAULT_DAILY_LIMIT;
  const added = row?.members_added ?? 0;
  return { remaining: Math.max(0, limit - added), limit, added };
}

async function bumpDailyQuota(tenantId: string, n: number): Promise<void> {
  await dbRun(
    `INSERT INTO tenant_daily_group_limits (id, tenant_id, date, max_daily_limit, members_added)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id, date) DO UPDATE SET members_added = tenant_daily_group_limits.members_added + EXCLUDED.members_added`,
    crypto.randomUUID(),
    tenantId,
    today(),
    DEFAULT_DAILY_LIMIT,
    n,
  );
}

function toJid(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  return `${digits}@c.us`;
}

async function processOne(q: QueueRow): Promise<void> {
  const phones: string[] = (() => {
    try {
      const parsed = coerceJson(q.phone_numbers);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  })();
  const processed = q.processed_count ?? 0;
  if (processed >= phones.length) {
    await dbRun(
      "UPDATE group_add_queue SET status = 'completed', completed_at = ? WHERE id = ?",
      new Date().toISOString(),
      q.id,
    );
    emitChange("group_add_queue", q.tenant_id, { id: q.id });
    return;
  }

  const group = await dbGet<GroupRow>(
    "SELECT id, tenant_id, instance_id, wa_group_id FROM whatsapp_groups WHERE id = ? AND tenant_id = ? LIMIT 1",
    q.group_id,
    q.tenant_id,
  );
  if (!group) {
    await appendError(q.id, "Group not found; cancelling queue");
    await dbRun("UPDATE group_add_queue SET status = 'cancelled' WHERE id = ?", q.id);
    return;
  }

  const { remaining } = await remainingDailyQuota(q.tenant_id);
  if (remaining <= 0) {
    // Daily cap hit — leave pending and try again after the interval (tomorrow).
    await pushSchedule(q);
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
    for (const phone of batch)
      await dbRun(
        `INSERT INTO whatsapp_group_participants (id, group_id, tenant_id, phone_number, is_admin, added_at)
       VALUES (?, ?, ?, ?, false, ?)
       ON CONFLICT DO NOTHING`,
        crypto.randomUUID(),
        group.id,
        group.tenant_id,
        phone.replace(/[^0-9]/g, ""),
        now,
      );
    added = batch.length;
  } catch (err) {
    failed = batch.length;
    await appendError(q.id, err instanceof Error ? err.message : "Batch add failed");
  }

  if (added > 0) await bumpDailyQuota(q.tenant_id, added);

  const newProcessed = processed + added + failed;
  const done = newProcessed >= phones.length;
  await dbRun(
    `UPDATE group_add_queue
         SET processed_count = ?, failed_count = ?, status = ?, completed_at = ?
       WHERE id = ?`,
    newProcessed,
    (q.failed_count ?? 0) + failed,
    done ? "completed" : "processing",
    done ? new Date().toISOString() : null,
    q.id,
  );
  if (!done) await pushSchedule(q);
  emitChange("group_add_queue", q.tenant_id, { id: q.id });
}

/** Push the next batch's scheduled_for forward by the queue's interval. */
async function pushSchedule(q: QueueRow): Promise<void> {
  const intervalMin = Math.max(1, q.interval_minutes ?? DEFAULT_INTERVAL_MIN);
  const next = new Date(Date.now() + intervalMin * 60 * 1000).toISOString();
  await dbRun("UPDATE group_add_queue SET scheduled_for = ? WHERE id = ?", next, q.id);
}

async function appendError(queueId: string, message: string): Promise<void> {
  const row = await dbGet<{ error_log: string | null }>(
    "SELECT error_log FROM group_add_queue WHERE id = ?",
    queueId,
  );
  let log: unknown[] = [];
  try {
    log = row?.error_log ? coerceJson(row.error_log) : [];
  } catch {
    log = [];
  }
  log.push({ at: new Date().toISOString(), message });
  await dbRun(
    "UPDATE group_add_queue SET error_log = ? WHERE id = ?",
    JSON.stringify(log.slice(-20)),
    queueId,
  );
}

/**
 * Processes one due batch for every active queue (optionally a single tenant).
 * Called on a scheduler tick and by the group-batch-processor fn.
 */
export async function processGroupAddQueue(tenantId?: string): Promise<{ processed: number }> {
  const now = new Date().toISOString();
  const rows = await dbAll<QueueRow>(
    `SELECT id, tenant_id, group_id, phone_numbers, batch_size, interval_minutes,
              processed_count, failed_count, error_log, status
         FROM group_add_queue
        WHERE status IN ('pending','processing') AND scheduled_for <= ?
          ${tenantId ? "AND tenant_id = ?" : ""}`,
    ...(tenantId ? [now, tenantId] : [now]),
  );

  for (const q of rows) {
    try {
      await processOne(q);
    } catch {
      // Per-queue failures are recorded on the row; continue the sweep.
    }
  }
  return { processed: rows.length };
}
