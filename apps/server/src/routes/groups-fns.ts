import { dbGet, dbRun, dbTx } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { wahaClient, sessionNameForInstance, WahaError } from "../waha/client.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Groups module (basic) — create / sync / metadata / participant management /
 * invite / group-send. Ported from supabase/functions/group-* but retargeted at
 * the WAHA group API (replaces the Wasender calls).
 *
 * Bulk group tooling (group-queue-batch, group-batch-processor) is deferred-v1;
 * the queue handler records the request but does not run a batch worker yet.
 */

const ok = (data: unknown): FnResult => ({ data, error: null });

interface InstanceRow {
  id: string;
  tenant_id: string;
  status: string;
}

async function loadActiveInstance(
  instanceId: string,
  ctx: FnContext,
): Promise<InstanceRow | { error: string }> {
  const row = (await dbGet(
    "SELECT id, tenant_id, status FROM whatsapp_instances WHERE id = ? LIMIT 1",
    instanceId,
  )) as InstanceRow | undefined;
  if (!row) return { error: "Instance not found" };
  if (!ctx.isAdmin && row.tenant_id !== ctx.tenantId) return { error: "Forbidden instance" };
  if (row.status !== "active") return { error: "Instance not connected" };
  return row;
}

interface GroupRow {
  id: string;
  tenant_id: string;
  instance_id: string;
  wa_group_id: string;
}

async function loadGroup(groupId: string, ctx: FnContext): Promise<GroupRow | { error: string }> {
  const row = (await dbGet(
    "SELECT id, tenant_id, instance_id, wa_group_id FROM whatsapp_groups WHERE id = ? LIMIT 1",
    groupId,
  )) as GroupRow | undefined;
  if (!row) return { error: "Group not found" };
  if (!ctx.isAdmin && row.tenant_id !== ctx.tenantId) return { error: "Forbidden group" };
  return row;
}

function toJid(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  return `${clean}@s.whatsapp.net`;
}

function wahaMessage(err: unknown): string {
  if (err instanceof WahaError) return err.body || err.message;
  return err instanceof Error ? err.message : "WAHA request failed";
}

interface CreateBody {
  instance_id?: string;
  group_name?: string;
  participant_phone_numbers?: string[];
}

/** group-create: create the group on WAHA, persist group + participants. */
export async function groupCreate(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as CreateBody;
  if (!body.instance_id || !body.group_name) return ok({ error: "instance_id and group_name are required" });
  const instance = await loadActiveInstance(body.instance_id, ctx);
  if ("error" in instance) return ok({ error: instance.error });

  const participants = (body.participant_phone_numbers ?? []).map(toJid);
  const session = sessionNameForInstance(instance.id);
  let result: { id?: string; subject?: string; participants?: Array<{ id?: string }> };
  try {
    const raw2 = (await wahaClient.createGroup(session, body.group_name, participants)) as {
      id?: { _serialized?: string } | string;
      subject?: string;
      participants?: Array<{ id?: string }>;
    };
    const idVal = typeof raw2.id === "object" ? raw2.id?._serialized : raw2.id;
    result = { id: idVal, subject: raw2.subject, participants: raw2.participants };
  } catch (err) {
    return ok({ error: "Failed to create group", details: wahaMessage(err) });
  }

  const groupId = crypto.randomUUID();
  const waGroupId = result.id ?? `${Date.now()}@g.us`;
  const groupParticipants = result.participants ?? [];
  await dbRun(
    `INSERT INTO whatsapp_groups
         (id, tenant_id, instance_id, wa_group_id, name, participant_count, is_admin, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, true, ?)`,
    groupId,
    instance.tenant_id,
    instance.id,
    waGroupId,
    result.subject ?? body.group_name,
    groupParticipants.length,
    new Date().toISOString(),
  );

  const now = new Date().toISOString();
  for (const p of groupParticipants) {
    const phone = (p.id ?? "").replace("@s.whatsapp.net", "").replace("@lid", "");
    if (phone)
      await dbRun(
        `INSERT INTO whatsapp_group_participants
       (id, group_id, tenant_id, phone_number, is_admin, added_at)
     VALUES (?, ?, ?, ?, false, ?)
     ON CONFLICT DO NOTHING`,
        crypto.randomUUID(),
        groupId,
        instance.tenant_id,
        phone,
        now,
      );
  }
  emitChange("whatsapp_groups", instance.tenant_id, { id: groupId });

  return ok({ success: true, group_id: groupId, wa_group_id: waGroupId });
}

/** group-sync: pull the group list from WAHA and upsert into whatsapp_groups. */
export async function groupSync(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = raw.instance_id as string | undefined;
  if (!instanceId) return ok({ error: "instance_id is required" });
  const instance = await loadActiveInstance(instanceId, ctx);
  if ("error" in instance) return ok({ error: instance.error });

  const session = sessionNameForInstance(instance.id);
  let groups: Array<{ id?: { _serialized?: string } | string; subject?: string; participants?: unknown[] }> = [];
  try {
    groups = (await wahaClient.getGroups(session)) as typeof groups;
  } catch (err) {
    return ok({ error: "Failed to sync groups", details: wahaMessage(err) });
  }

  const now = new Date().toISOString();
  let count = 0;
  await dbTx(async (tx) => {
    for (const g of groups) {
      const waId = typeof g.id === "object" ? g.id?._serialized : g.id;
      if (!waId) continue;
      await tx.run(
        `INSERT INTO whatsapp_groups
       (id, tenant_id, instance_id, wa_group_id, name, participant_count, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, wa_group_id) DO UPDATE SET
       name = excluded.name,
       participant_count = excluded.participant_count,
       synced_at = excluded.synced_at`,
        crypto.randomUUID(),
        instance.tenant_id,
        instance.id,
        waId,
        g.subject ?? "Group",
        Array.isArray(g.participants) ? g.participants.length : 0,
        now,
      );
      count++;
    }
  });
  emitChange("whatsapp_groups", instance.tenant_id, {});
  return ok({ success: true, synced: count });
}

/** group-metadata: fetch fresh metadata for a single group. */
export async function groupMetadata(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const groupId = raw.group_id as string | undefined;
  if (!groupId) return ok({ error: "group_id is required" });
  const group = await loadGroup(groupId, ctx);
  if ("error" in group) return ok({ error: group.error });

  const session = sessionNameForInstance(group.instance_id);
  try {
    const meta = (await wahaClient.getGroup(session, group.wa_group_id)) as {
      subject?: string;
      participants?: unknown[];
      description?: string;
    };
    const count = Array.isArray(meta.participants) ? meta.participants.length : undefined;
    await dbRun(
      "UPDATE whatsapp_groups SET name = COALESCE(?, name), description = COALESCE(?, description), participant_count = COALESCE(?, participant_count), synced_at = ? WHERE id = ?",
      meta.subject ?? null,
      meta.description ?? null,
      count ?? null,
      new Date().toISOString(),
      group.id,
    );
    emitChange("whatsapp_groups", group.tenant_id, { id: group.id });
    return ok({ success: true, metadata: meta });
  } catch (err) {
    return ok({ error: "Failed to fetch metadata", details: wahaMessage(err) });
  }
}

async function changeParticipants(
  raw: Record<string, unknown>,
  ctx: FnContext,
  mode: "add" | "remove",
): Promise<FnResult> {
  const groupId = raw.group_id as string | undefined;
  const phones = (raw.phone_numbers as string[]) ?? [];
  if (!groupId || phones.length === 0) return ok({ error: "group_id and phone_numbers are required" });
  const group = await loadGroup(groupId, ctx);
  if ("error" in group) return ok({ error: group.error });

  const session = sessionNameForInstance(group.instance_id);
  const jids = phones.map(toJid);
  try {
    if (mode === "add") await wahaClient.addGroupParticipants(session, group.wa_group_id, jids);
    else await wahaClient.removeGroupParticipants(session, group.wa_group_id, jids);
  } catch (err) {
    return ok({ error: `Failed to ${mode} participants`, details: wahaMessage(err) });
  }

  const now = new Date().toISOString();
  if (mode === "add") {
    for (const phone of phones)
      await dbRun(
        `INSERT INTO whatsapp_group_participants
         (id, group_id, tenant_id, phone_number, is_admin, added_at)
       VALUES (?, ?, ?, ?, false, ?)
       ON CONFLICT DO NOTHING`,
        crypto.randomUUID(),
        group.id,
        group.tenant_id,
        phone.replace(/[^0-9]/g, ""),
        now,
      );
  } else {
    for (const phone of phones)
      await dbRun(
        "DELETE FROM whatsapp_group_participants WHERE group_id = ? AND phone_number = ?",
        group.id,
        phone.replace(/[^0-9]/g, ""),
      );
  }
  emitChange("whatsapp_group_participants", group.tenant_id, { group_id: group.id });
  return ok({ success: true, [mode === "add" ? "added" : "removed"]: phones.length });
}

export async function groupAddParticipants(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  return changeParticipants(raw, ctx, "add");
}

export async function groupRemoveParticipants(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  return changeParticipants(raw, ctx, "remove");
}

/** group-send-invite: fetch the group's invite link from WAHA. */
export async function groupSendInvite(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const groupId = raw.group_id as string | undefined;
  if (!groupId) return ok({ error: "group_id is required" });
  const group = await loadGroup(groupId, ctx);
  if ("error" in group) return ok({ error: group.error });
  const session = sessionNameForInstance(group.instance_id);
  try {
    const res = await wahaClient.getGroupInviteCode(session, group.wa_group_id);
    const link = res.code ? `https://chat.whatsapp.com/${res.code}` : null;
    if (link) {
      await dbRun("UPDATE whatsapp_groups SET invite_link = ? WHERE id = ?", link, group.id);
    }
    return ok({ success: true, invite_link: link });
  } catch (err) {
    return ok({ error: "Failed to fetch invite link", details: wahaMessage(err) });
  }
}

/** group-send-message: send a message to a group chat via WAHA. */
export async function groupSendMessage(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const groupId = raw.group_id as string | undefined;
  const content = (raw.content as string) ?? "";
  if (!groupId) return ok({ success: false, error: "group_id is required" });
  const group = await loadGroup(groupId, ctx);
  if ("error" in group) return ok({ success: false, error: group.error });

  const session = sessionNameForInstance(group.instance_id);
  try {
    const result = await wahaClient.sendText({ session, chatId: group.wa_group_id, text: content });
    return ok({ success: true, wa_message_id: result.id, group_id: group.id });
  } catch (err) {
    return ok({ success: false, error: wahaMessage(err) });
  }
}

/**
 * Enqueue a bulk group-add job. Validates group ownership + the phone list, then
 * records a group_add_queue row the worker drains in paced, daily-capped batches
 * (see services/groups/queue-processor.ts). High ban-risk, hence the pacing.
 */
export async function groupQueueBatch(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.tenantId) return ok({ success: false, error: "No active tenant" });
  const groupId = raw.group_id as string | undefined;
  const phones = Array.isArray(raw.phone_numbers) ? (raw.phone_numbers as unknown[]).map(String).filter(Boolean) : [];
  if (!groupId) return ok({ success: false, error: "group_id is required" });
  if (phones.length === 0) return ok({ success: false, error: "phone_numbers must be a non-empty list" });

  const group = await loadGroup(groupId, ctx);
  if ("error" in group) return ok({ success: false, error: group.error });

  const batchSize = Math.min(20, Math.max(1, Number(raw.batch_size) || 5));
  const intervalMinutes = Math.max(5, Number(raw.interval_minutes) || 30);
  const scheduledFor = typeof raw.scheduled_for === "string" ? raw.scheduled_for : new Date().toISOString();
  const id = crypto.randomUUID();

  await dbRun(
    `INSERT INTO group_add_queue
         (id, tenant_id, group_id, phone_numbers, batch_size, interval_minutes,
          processed_count, failed_count, status, scheduled_for, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'pending', ?, ?)`,
    id,
    ctx.tenantId,
    group.id,
    JSON.stringify(phones),
    batchSize,
    intervalMinutes,
    scheduledFor,
    ctx.userId ?? null,
  );
  emitChange("group_add_queue", ctx.tenantId, { id });
  return ok({ success: true, queue_id: id, total: phones.length });
}

/** group-batch-processor: manual trigger to drain due batches for this tenant. */
export async function groupBatchProcessor(_raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.tenantId) return ok({ success: false, error: "No active tenant" });
  const { processGroupAddQueue } = await import("../services/groups/queue-processor.js");
  const result = await processGroupAddQueue(ctx.tenantId);
  return ok({ success: true, ...result });
}

export const GROUP_HANDLERS = {
  "group-create": groupCreate,
  "group-sync": groupSync,
  "group-metadata": groupMetadata,
  "group-add-participants": groupAddParticipants,
  "group-remove-participants": groupRemoveParticipants,
  "group-send-invite": groupSendInvite,
  "group-send-message": groupSendMessage,
  "group-queue-batch": groupQueueBatch,
  "group-batch-processor": groupBatchProcessor,
};
