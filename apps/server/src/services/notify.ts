import { dbRun } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { sendPushToTenant, sendPushToUser } from "./push.js";

/**
 * Single notification entry point: in-app row + SSE event + web-push fan-out.
 * Use this from feature code (handoffs, payments, CEO reports) instead of
 * inserting notifications rows directly, so every channel stays in sync.
 */

export interface NotifyOptions {
  tenantId: string;
  type: string;
  title: string;
  body: string;
  /** Deep link opened from the push notification. */
  url?: string;
  /** Target one user; omitted = whole tenant. */
  userId?: string;
  metadata?: Record<string, unknown>;
}

export async function notify(options: NotifyOptions): Promise<void> {
  await dbRun(
    `INSERT INTO notifications (id, tenant_id, channel, type, status, recipient, metadata)
       VALUES (?, ?, 'in_app', ?, 'pending', ?, ?)`,
    crypto.randomUUID(),
    options.tenantId,
    options.type,
    options.userId ?? null,
    JSON.stringify({ title: options.title, body: options.body, url: options.url, ...options.metadata }),
  );
  emitChange("notifications", options.tenantId, {});

  const payload = { title: options.title, body: options.body, url: options.url };
  const send = options.userId
    ? sendPushToUser(options.tenantId, options.userId, payload)
    : sendPushToTenant(options.tenantId, payload);
  void send.catch(() => {
    // Push is best-effort; the in-app + SSE copies already landed.
  });
}
