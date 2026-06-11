import { sqlite } from "../db/index.js";
import { emitChange } from "../realtime/emitter.js";
import { wahaClient, sessionNameForInstance, WahaError } from "../waha/client.js";
import {
  MAX_RETRY_ATTEMPTS,
  calculateBackoff,
  isRetryableError,
  isNonRetryableError,
  sleep,
} from "../lib/retry.js";
import { outboundRateLimiter } from "../lib/rate-limiter.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Outbound messaging — wired into POST /api/fn/send-message. Preserves the EXACT
 * response contract the frontend (useSendMessage) depends on:
 *   { success, message_id, wa_message_id, error, code, current, max, upgrade_required }
 *
 * Pipeline: plan-limit check → per-number rate limit (proactive cap, reactive
 * bypass) → insert pending outbound row → WAHA send with exponential backoff →
 * mark sent + emit SSE.
 */

const DEFAULT_MAX_MESSAGES = 1000;
/** A reply is "reactive" if the contact messaged us within this window. */
const REACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

interface ContactRow {
  id: string;
  tenant_id: string;
  instance_id: string | null;
  wa_id: string;
  phone_number: string;
}

interface InstanceRow {
  id: string;
  status: string;
}

function currentUsage(tenantId: string): number {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const row = sqlite
    .prepare(
      "SELECT messages_sent FROM usage_counters WHERE tenant_id = ? AND period_start = ? LIMIT 1",
    )
    .get(tenantId, periodStart) as { messages_sent: number } | undefined;
  return row?.messages_sent ?? 0;
}

function planMaxMessages(tenantId: string): number {
  const sub = sqlite
    .prepare("SELECT status, resource_overrides FROM subscriptions WHERE tenant_id = ? LIMIT 1")
    .get(tenantId) as { status: string; resource_overrides: unknown } | undefined;
  if (sub?.resource_overrides && typeof sub.resource_overrides === "object") {
    const max = (sub.resource_overrides as { max_messages_per_month?: number }).max_messages_per_month;
    if (typeof max === "number") return max;
  }
  return DEFAULT_MAX_MESSAGES;
}

function subscriptionSuspended(tenantId: string): boolean {
  const sub = sqlite
    .prepare("SELECT status FROM subscriptions WHERE tenant_id = ? LIMIT 1")
    .get(tenantId) as { status: string } | undefined;
  return sub?.status === "suspended";
}

type ResolveInstanceResult =
  | { ok: true; instance: InstanceRow }
  | { ok: false; error: string };

/**
 * Resolves the WhatsApp instance to send through.
 *
 * SECURITY: every lookup is scoped to the caller's tenant. When an explicit
 * `preferredId` was supplied (from the request body or the contact's own
 * instance_id), it MUST belong to the caller's tenant and be active — a
 * mismatch is rejected explicitly rather than silently falling back to the
 * tenant's default instance (which would mask a cross-tenant IDOR attempt where
 * an attacker passes a foreign instance_id to send through another tenant's
 * WhatsApp number). The default-instance fallback applies only when NO
 * preferredId was supplied.
 */
function resolveInstance(
  tenantId: string,
  preferredId: string | null,
  explicit: boolean,
): ResolveInstanceResult {
  if (preferredId) {
    const row = sqlite
      .prepare(
        "SELECT id, status FROM whatsapp_instances WHERE id = ? AND tenant_id = ? LIMIT 1",
      )
      .get(preferredId, tenantId) as InstanceRow | undefined;
    if (!row) {
      // Unknown instance, or one owned by another tenant: reject explicitly.
      if (explicit) {
        return { ok: false, error: "Instance not found" };
      }
      // The contact's denormalized instance_id is stale; fall back to default.
    } else if (row.status === "active") {
      return { ok: true, instance: row };
    } else if (explicit) {
      // Caller named a specific instance that exists but is not connected.
      return { ok: false, error: "Selected instance is not connected" };
    }
  }

  const fallback = sqlite
    .prepare(
      `SELECT id, status FROM whatsapp_instances
       WHERE tenant_id = ? AND status = 'active' AND (is_deleted IS NULL OR is_deleted = 0)
       ORDER BY is_default DESC LIMIT 1`,
    )
    .get(tenantId) as InstanceRow | undefined;
  if (!fallback) {
    return { ok: false, error: "No active instance available" };
  }
  return { ok: true, instance: fallback };
}

/** A send is reactive when the contact has a recent inbound message. */
function isReactive(contactId: string): boolean {
  const cutoff = new Date(Date.now() - REACTIVE_WINDOW_MS).toISOString();
  const row = sqlite
    .prepare(
      "SELECT 1 FROM messages WHERE contact_id = ? AND direction = 'inbound' AND created_at >= ? LIMIT 1",
    )
    .get(contactId, cutoff);
  return row !== undefined;
}

interface SendBody {
  contact_id?: string;
  content?: string;
  content_type?: string;
  instance_id?: string;
  media_url?: string;
  media_filename?: string;
  location_lat?: number;
  location_lng?: number;
  reply_to_id?: string;
}

/** Performs the WAHA send with retry/backoff. Returns wa_message_id or throws. */
async function sendViaWaha(
  sessionName: string,
  chatId: string,
  body: SendBody,
  replyTo: string | null,
): Promise<string | undefined> {
  let lastError = "";
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const type = body.content_type ?? "text";
      let result;
      if (type === "image" && body.media_url) {
        result = await wahaClient.sendImage({
          session: sessionName,
          chatId,
          file: { url: body.media_url, filename: body.media_filename },
          caption: body.content,
          reply_to: replyTo,
        });
      } else if (
        (type === "video" || type === "audio" || type === "document" || type === "sticker") &&
        body.media_url
      ) {
        result = await wahaClient.sendFile({
          session: sessionName,
          chatId,
          file: { url: body.media_url, filename: body.media_filename },
          caption: body.content,
          reply_to: replyTo,
        });
      } else {
        result = await wahaClient.sendText({
          session: sessionName,
          chatId,
          text: body.content ?? "",
          reply_to: replyTo,
        });
      }
      return result.id;
    } catch (error) {
      const status = error instanceof WahaError ? error.status : 0;
      const message = error instanceof WahaError ? error.body : (error as Error).message;
      lastError = message;
      if (isNonRetryableError(status, message)) {
        throw new Error(message);
      }
      if (isRetryableError(status, message) && attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(calculateBackoff(attempt));
        continue;
      }
      if (attempt >= MAX_RETRY_ATTEMPTS) {
        throw new Error(message);
      }
    }
  }
  throw new Error(lastError || "Send failed");
}

/** POST /api/fn/send-message handler. */
export async function sendMessage(rawBody: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = rawBody as SendBody;
  if (!body.contact_id) {
    return { data: { success: false, error: "contact_id is required" }, error: null };
  }

  const contact = sqlite
    .prepare(
      "SELECT id, tenant_id, instance_id, wa_id, phone_number FROM contacts WHERE id = ? LIMIT 1",
    )
    .get(body.contact_id) as ContactRow | undefined;
  if (!contact) {
    return { data: { success: false, error: "Contact not found" }, error: null };
  }
  if (!ctx.isAdmin && contact.tenant_id !== ctx.tenantId) {
    return { data: { success: false, error: "Forbidden" }, error: null };
  }

  if (subscriptionSuspended(contact.tenant_id)) {
    return { data: { success: false, error: "Subscription suspended" }, error: null };
  }

  const usage = currentUsage(contact.tenant_id);
  const max = planMaxMessages(contact.tenant_id);
  if (usage >= max) {
    return {
      data: {
        success: false,
        error: "Message limit reached",
        code: "MESSAGE_LIMIT_REACHED",
        current: usage,
        max,
        upgrade_required: true,
      },
      error: null,
    };
  }

  // `explicit` is true only when the caller named an instance_id in the request;
  // the contact's own instance_id is a denormalized hint, not a user-supplied
  // selection, so a stale value there falls back rather than hard-rejects.
  const explicitInstanceId = typeof body.instance_id === "string" && body.instance_id.length > 0;
  const resolved = resolveInstance(
    contact.tenant_id,
    body.instance_id ?? contact.instance_id,
    explicitInstanceId,
  );
  if (!resolved.ok) {
    return { data: { success: false, error: resolved.error }, error: null };
  }
  const instance = resolved.instance;

  // Per-number rate limit: proactive sends capped, reactive replies bypass.
  const reactive = isReactive(contact.id);
  const decision = outboundRateLimiter.check(instance.id, reactive);
  if (!decision.allowed) {
    return {
      data: {
        success: false,
        error: "Hourly send limit reached for this number. Slow down to avoid a WhatsApp ban.",
        code: "RATE_LIMITED",
      },
      error: null,
    };
  }

  // Insert the pending outbound row.
  const messageId = crypto.randomUUID();
  sqlite
    .prepare(
      `INSERT INTO messages
         (id, tenant_id, instance_id, contact_id, direction, status, content_type, content,
          media_url, media_filename, location_lat, location_lng, reply_to_id, sent_by_user_id)
       VALUES (?, ?, ?, ?, 'outbound', 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      messageId,
      contact.tenant_id,
      instance.id,
      contact.id,
      body.content_type ?? "text",
      body.content ?? null,
      body.media_url ?? null,
      body.media_filename ?? null,
      body.location_lat != null ? String(body.location_lat) : null,
      body.location_lng != null ? String(body.location_lng) : null,
      body.reply_to_id ?? null,
      ctx.userId ?? null,
    );
  emitChange("messages", contact.tenant_id, { contact_id: contact.id });

  // Resolve reply target's wa_message_id — scoped to the caller's tenant so a
  // foreign message id can't be used (or leaked) as a reply target.
  let replyTo: string | null = null;
  if (body.reply_to_id) {
    const replied = sqlite
      .prepare("SELECT wa_message_id FROM messages WHERE id = ? AND tenant_id = ? LIMIT 1")
      .get(body.reply_to_id, contact.tenant_id) as { wa_message_id: string | null } | undefined;
    replyTo = replied?.wa_message_id ?? null;
  }

  const chatId = contact.wa_id || `${contact.phone_number}@c.us`;
  const sessionName = sessionNameForInstance(instance.id);

  try {
    const waMessageId = await sendViaWaha(sessionName, chatId, body, replyTo);
    sqlite
      .prepare(
        "UPDATE messages SET status = 'sent', wa_message_id = ?, sent_at = ?, error_message = NULL WHERE id = ?",
      )
      .run(waMessageId ?? null, new Date().toISOString(), messageId);
    emitChange("messages", contact.tenant_id, { contact_id: contact.id });
    return { data: { success: true, message_id: messageId, wa_message_id: waMessageId }, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Send failed";
    // Keep pending so a future retry can resend (matches Wasender behavior).
    sqlite
      .prepare("UPDATE messages SET status = 'pending', error_message = ? WHERE id = ?")
      .run(message, messageId);
    emitChange("messages", contact.tenant_id, { contact_id: contact.id });
    return { data: { success: false, error: message, message_id: messageId }, error: null };
  }
}

/** send-new-message: alias to send-message (same create-and-send semantics). */
export async function sendNewMessage(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  return sendMessage(body, ctx);
}

/** group-send-message: basic stub — group messaging is a Phase 3 module. */
export async function groupSendMessage(): Promise<FnResult> {
  return {
    data: { success: false, error: "Group messaging not yet available", code: "NOT_IMPLEMENTED" },
    error: null,
  };
}
