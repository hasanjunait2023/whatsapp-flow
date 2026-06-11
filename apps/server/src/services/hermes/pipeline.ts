import { sqlite } from "../../db/index.js";
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
  enabled: number;
  channels: string | null;
  reply_delay_ms: number;
  escalation_keywords: string | null;
}

interface ContactStateRow {
  id: string;
  tenant_id: string;
  needs_handoff: number;
  replying_user_id: string | null;
  is_blocked: number;
  is_archived: number;
}

function hermesConfig(tenantId: string): HermesConfigRow | undefined {
  return sqlite
    .prepare(
      `SELECT enabled, channels, reply_delay_ms, escalation_keywords
       FROM agent_configs WHERE tenant_id = ? AND agent = 'hermes' LIMIT 1`,
    )
    .get(tenantId) as HermesConfigRow | undefined;
}

function channelEnabled(config: HermesConfigRow, channel: string): boolean {
  if (!config.channels) return channel === "whatsapp"; // default: whatsapp only
  try {
    const channels = JSON.parse(config.channels) as string[];
    return channels.includes(channel);
  } catch {
    return channel === "whatsapp";
  }
}

function contactState(contactId: string): ContactStateRow | undefined {
  return sqlite
    .prepare(
      `SELECT id, tenant_id, needs_handoff, replying_user_id, is_blocked, is_archived
       FROM contacts WHERE id = ? LIMIT 1`,
    )
    .get(contactId) as ContactStateRow | undefined;
}

/** True when the latest message in the thread is inbound (no human replied). */
function latestMessageIsInbound(contactId: string): boolean {
  const row = sqlite
    .prepare(
      `SELECT direction FROM messages WHERE contact_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(contactId) as { direction: string } | undefined;
  return row?.direction === "inbound";
}

function contactPassesGuards(contact: ContactStateRow | undefined): contact is ContactStateRow {
  return (
    contact !== undefined &&
    contact.needs_handoff === 0 &&
    contact.replying_user_id === null &&
    contact.is_blocked === 0 &&
    contact.is_archived === 0
  );
}

function matchesEscalationKeyword(config: HermesConfigRow, text: string): boolean {
  if (!config.escalation_keywords) return false;
  try {
    const keywords = JSON.parse(config.escalation_keywords) as string[];
    const lower = text.toLowerCase();
    return keywords.some((k) => k && lower.includes(k.toLowerCase()));
  } catch {
    return false;
  }
}

export function applyHandoff(tenantId: string, contactId: string, reason: string): void {
  const now = new Date().toISOString();
  sqlite
    .prepare(
      `UPDATE contacts SET needs_handoff = 1, handoff_reason = ?, handoff_at = ? WHERE id = ?`,
    )
    .run(reason, now, contactId);
  sqlite
    .prepare(
      `UPDATE contact_thread_state SET needs_handoff = 1, handoff_reason = ?, updated_at = ? WHERE contact_id = ?`,
    )
    .run(reason, now, contactId);
  sqlite
    .prepare(
      `INSERT INTO notifications (id, tenant_id, channel, type, status, metadata)
       VALUES (?, ?, 'in_app', 'ai_handoff', 'pending', ?)`,
    )
    .run(crypto.randomUUID(), tenantId, JSON.stringify({ contact_id: contactId, reason }));
  emitChange("contacts", tenantId, { id: contactId });
  emitChange("contact_thread_state", tenantId, { contact_id: contactId });
  emitChange("notifications", tenantId, {});
}

function handleInbound(event: InboundMessageEvent): void {
  const config = hermesConfig(event.tenantId);
  if (!config || config.enabled !== 1) return;
  if (!channelEnabled(config, event.channel)) return;

  const contact = contactState(event.contactId);
  if (!contactPassesGuards(contact)) return;

  // Escalation keywords trigger an immediate handoff, no LLM call.
  const message = sqlite
    .prepare(`SELECT content FROM messages WHERE id = ? LIMIT 1`)
    .get(event.messageId) as { content: string | null } | undefined;
  if (message?.content && matchesEscalationKeyword(config, message.content)) {
    applyHandoff(event.tenantId, event.contactId, "Escalation keyword matched");
    return;
  }

  const delay = config.reply_delay_ms ?? DEFAULT_REPLY_DELAY_MS;
  enqueueJob({
    kind: HERMES_REPLY_JOB,
    tenantId: event.tenantId,
    payload: { contactId: event.contactId, instanceId: event.instanceId },
    runAt: new Date(Date.now() + delay).toISOString(),
    dedupeKey: `hermes:${event.contactId}`,
  });
}

async function runReplyJob(payload: unknown): Promise<void> {
  const { contactId, instanceId } = payload as { contactId: string; instanceId: string };
  const contact = contactState(contactId);
  if (!contactPassesGuards(contact)) return;
  const tenantId = contact.tenant_id;

  const config = hermesConfig(tenantId);
  if (!config || config.enabled !== 1) return;
  if (!latestMessageIsInbound(contactId)) return; // human already replied

  let outcome;
  try {
    outcome = await runHermesAgent(tenantId, contactId, { trigger: "inbound_message" });
  } catch (err) {
    if (err instanceof BudgetExceededError) return; // silent: budget dashboards alert
    throw err;
  }

  if (outcome.kind === "handoff") {
    applyHandoff(tenantId, contactId, outcome.handoffReason ?? "AI requested handoff");
    return;
  }
  if (outcome.kind !== "reply" || !outcome.reply) return;

  const sendResult = await sendMessage(
    { contact_id: contactId, content: outcome.reply, content_type: "text", instance_id: instanceId },
    { userId: "", tenantId, isAdmin: false },
  );
  const data = sendResult.data as { success?: boolean; message_id?: string } | null;
  if (data?.message_id) {
    sqlite
      .prepare(`UPDATE messages SET is_from_ai = 1, sent_by_user_id = NULL WHERE id = ?`)
      .run(data.message_id);
    emitChange("messages", tenantId, { contact_id: contactId });
  }
}

export function registerHermesPipeline(): void {
  onInboundMessagePersisted(handleInbound);
  registerJobHandler(HERMES_REPLY_JOB, runReplyJob);
}
