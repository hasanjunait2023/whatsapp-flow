import { dbGet, dbRun, coerceJson } from "../../db/raw.js";
import { emitChange } from "../../realtime/emitter.js";
import { enqueueJob, registerJobHandler } from "../../jobs/queue.js";
import { onInboundMessagePersisted, type InboundMessageEvent } from "../inbound-hooks.js";
import { sendMessage } from "../../routes/messaging.js";
import { runHermesAgent } from "./agent.js";
import { BudgetExceededError } from "../../llm/usage.js";

/**
 * Hermes inbound pipeline. Subscribes to the webhook's persisted-message hook,
 * debounces bursts per contact via the durable job queue (the dedupe_key
 * replaces the pending job, so 5 rapid messages -> one agent run), re-checks
 * every guard at run time (state changes during the delay), and sends the
 * reply through the standard send-message path flagged is_from_ai.
 */

export const HERMES_REPLY_JOB = "hermes_reply";
const DEFAULT_REPLY_DELAY_MS = 8000;

interface HermesConfigRow {
  enabled: boolean;
  channels: string | null;
  reply_delay_ms: number;
  escalation_keywords: string | null;
}

interface ContactStateRow {
  id: string;
  tenant_id: string;
  needs_handoff: boolean;
  replying_user_id: string | null;
  is_blocked: boolean;
  is_archived: boolean;
}

async function hermesConfig(tenantId: string): Promise<HermesConfigRow | undefined> {
  return (await dbGet(
    `SELECT enabled, channels, reply_delay_ms, escalation_keywords
       FROM agent_configs WHERE tenant_id = ? AND agent = 'hermes' LIMIT 1`,
    tenantId,
  )) as HermesConfigRow | undefined;
}

function channelEnabled(config: HermesConfigRow, channel: string): boolean {
  if (!config.channels) return channel === "whatsapp"; // default: whatsapp only
  try {
    const channels = coerceJson<string[]>(config.channels);
    return channels.includes(channel);
  } catch {
    return channel === "whatsapp";
  }
}

async function contactState(contactId: string): Promise<ContactStateRow | undefined> {
  return (await dbGet(
    `SELECT id, tenant_id, needs_handoff, replying_user_id, is_blocked, is_archived
       FROM contacts WHERE id = ? LIMIT 1`,
    contactId,
  )) as ContactStateRow | undefined;
}

/** True when the latest message in the thread is inbound (no human replied). */
async function latestMessageIsInbound(contactId: string): Promise<boolean> {
  const row = (await dbGet(
    `SELECT direction FROM messages WHERE contact_id = ? ORDER BY created_at DESC LIMIT 1`,
    contactId,
  )) as { direction: string } | undefined;
  return row?.direction === "inbound";
}

function contactPassesGuards(contact: ContactStateRow | undefined): contact is ContactStateRow {
  return (
    contact !== undefined &&
    contact.needs_handoff === false &&
    contact.replying_user_id === null &&
    contact.is_blocked === false &&
    contact.is_archived === false
  );
}

function matchesEscalationKeyword(config: HermesConfigRow, text: string): boolean {
  if (!config.escalation_keywords) return false;
  try {
    const keywords = coerceJson<string[]>(config.escalation_keywords);
    const lower = text.toLowerCase();
    return keywords.some((k) => k && lower.includes(k.toLowerCase()));
  } catch {
    return false;
  }
}

export async function applyHandoff(tenantId: string, contactId: string, reason: string): Promise<void> {
  const now = new Date().toISOString();
  await dbRun(
    `UPDATE contacts SET needs_handoff = true, handoff_reason = ?, handoff_at = ? WHERE id = ?`,
    reason,
    now,
    contactId,
  );
  await dbRun(
    `UPDATE contact_thread_state SET needs_handoff = true, handoff_reason = ?, updated_at = ? WHERE contact_id = ?`,
    reason,
    now,
    contactId,
  );
  await dbRun(
    `INSERT INTO notifications (id, tenant_id, channel, type, status, metadata)
       VALUES (?, ?, 'in_app', 'ai_handoff', 'pending', ?)`,
    crypto.randomUUID(),
    tenantId,
    JSON.stringify({ contact_id: contactId, reason }),
  );
  emitChange("contacts", tenantId, { id: contactId });
  emitChange("contact_thread_state", tenantId, { contact_id: contactId });
  emitChange("notifications", tenantId, {});
}

async function handleInbound(event: InboundMessageEvent): Promise<void> {
  const config = await hermesConfig(event.tenantId);
  if (!config || config.enabled !== true) return;
  if (!channelEnabled(config, event.channel)) return;

  const contact = await contactState(event.contactId);
  if (!contactPassesGuards(contact)) return;

  // Escalation keywords trigger an immediate handoff, no LLM call.
  const message = (await dbGet(
    `SELECT content FROM messages WHERE id = ? LIMIT 1`,
    event.messageId,
  )) as { content: string | null } | undefined;
  if (message?.content && matchesEscalationKeyword(config, message.content)) {
    await applyHandoff(event.tenantId, event.contactId, "Escalation keyword matched");
    return;
  }

  const delay = config.reply_delay_ms ?? DEFAULT_REPLY_DELAY_MS;
  await enqueueJob({
    kind: HERMES_REPLY_JOB,
    tenantId: event.tenantId,
    payload: { contactId: event.contactId, instanceId: event.instanceId },
    runAt: new Date(Date.now() + delay).toISOString(),
    dedupeKey: `hermes:${event.contactId}`,
  });
}

async function runReplyJob(payload: unknown): Promise<void> {
  const { contactId, instanceId } = payload as { contactId: string; instanceId: string };
  const contact = await contactState(contactId);
  if (!contactPassesGuards(contact)) return;
  const tenantId = contact.tenant_id;

  const config = await hermesConfig(tenantId);
  if (!config || config.enabled !== true) return;
  if (!(await latestMessageIsInbound(contactId))) return; // human already replied

  let outcome;
  try {
    outcome = await runHermesAgent(tenantId, contactId, { trigger: "inbound_message" });
  } catch (err) {
    if (err instanceof BudgetExceededError) return; // silent: budget dashboards alert
    throw err;
  }

  if (outcome.kind === "handoff") {
    await applyHandoff(tenantId, contactId, outcome.handoffReason ?? "AI requested handoff");
    return;
  }
  if (outcome.kind !== "reply" || !outcome.reply) return;

  const sendResult = await sendMessage(
    { contact_id: contactId, content: outcome.reply, content_type: "text", instance_id: instanceId },
    { userId: "", tenantId, isAdmin: false },
  );
  const data = sendResult.data as { success?: boolean; message_id?: string } | null;
  if (data?.message_id) {
    await dbRun(
      `UPDATE messages SET is_from_ai = true, sent_by_user_id = NULL WHERE id = ?`,
      data.message_id,
    );
    emitChange("messages", tenantId, { contact_id: contactId });
  }
}

export function registerHermesPipeline(): void {
  onInboundMessagePersisted(handleInbound);
  registerJobHandler(HERMES_REPLY_JOB, runReplyJob);
}
