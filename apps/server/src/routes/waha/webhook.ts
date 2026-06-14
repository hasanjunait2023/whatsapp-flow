import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dbGet, dbRun } from "../../db/raw.js";
import { emitChange } from "../../realtime/emitter.js";
import {
  WAHA_WEBHOOK_HMAC_SECRET,
  WAHA_WEBHOOK_HMAC_ENFORCED,
} from "../../lib/env.js";
import {
  mapWahaMessage,
  downloadMedia,
  type WahaMessagePayload,
} from "../../waha/mapper.js";
import {
  ingestInbound,
  ingestOutboundSync,
  type IngestInstance,
} from "../../waha/ingest.js";
import { fireInboundMessagePersisted } from "../../services/inbound-hooks.js";
import { captureError } from "../../lib/error-tracking.js";

/**
 * POST /api/waha/webhook/:instanceId — receives WAHA NOWEB webhook events.
 *
 * This endpoint is NOT behind the tenant/session middleware (WAHA is a machine
 * caller). The instance id in the path resolves the tenant, and an optional
 * HMAC signature is verified when WAHA_WEBHOOK_HMAC_SECRET is configured
 * (WAHA Plus signs webhooks with X-Webhook-Hmac).
 *
 * Handled events: message / message.any (ingest), message.ack (status), and
 * session.status (instance status + QR/SSE for useInstanceQR).
 */
export const wahaWebhookRoute = new Hono();

interface InstanceRow {
  id: string;
  tenant_id: string;
  webhook_secret: string | null;
}

interface WahaWebhookBody {
  event?: string;
  session?: string;
  payload?: unknown;
  me?: { pushName?: string } | null;
}

const ACK_STATUS: Record<number, "sent" | "delivered" | "read" | "failed"> = {
  0: "failed",
  2: "sent",
  3: "delivered",
  4: "read",
  5: "read",
};

/**
 * Verifies the webhook HMAC signature.
 *
 * Fail-CLOSED when enforcement is on (a secret is set, or
 * WAHA_WEBHOOK_REQUIRE_HMAC=true): a missing or mismatched signature is
 * rejected. If enforcement is on but no secret is configured (REQUIRE without a
 * key — a misconfiguration), every webhook is rejected rather than accepted
 * unsigned. Verification is skipped ONLY in the explicit pilot/Core case where
 * enforcement is off (no secret and not required).
 */
function verifyHmac(raw: string, signature: string | undefined): boolean {
  if (!WAHA_WEBHOOK_HMAC_ENFORCED) {
    return true; // pilot/Core: explicitly unverified
  }
  if (!WAHA_WEBHOOK_HMAC_SECRET) {
    return false; // required but misconfigured (no key) → reject all
  }
  if (!signature) {
    return false; // enforced but unsigned → reject
  }
  const expected = createHmac("sha512", WAHA_WEBHOOK_HMAC_SECRET).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handleAck(payload: WahaMessagePayload, ack: number, tenantId: string): Promise<void> {
  const status = ACK_STATUS[ack];
  if (!status || !payload.id) return;
  const updates: string[] = ["status = ?"];
  const params: unknown[] = [status];
  if (status === "delivered") {
    updates.push("delivered_at = ?");
    params.push(new Date().toISOString());
  } else if (status === "read") {
    updates.push("read_at = ?");
    params.push(new Date().toISOString());
  }
  params.push(payload.id, tenantId);
  const info = await dbRun(
    `UPDATE messages SET ${updates.join(", ")} WHERE wa_message_id = ? AND tenant_id = ?`,
    ...params,
  );
  if (info.changes > 0) {
    emitChange("messages", tenantId, { wa_message_id: payload.id });
  }
}

interface SessionStatusPayload {
  name?: string;
  status?: string;
  me?: { id?: string; pushName?: string } | null;
}

async function handleSessionStatus(
  instance: InstanceRow,
  payload: SessionStatusPayload,
): Promise<void> {
  const raw = (payload.status ?? "").toUpperCase();
  let status: string | null = null;
  const updates: string[] = [];
  const params: unknown[] = [];
  const now = new Date().toISOString();

  if (raw === "WORKING") {
    status = "active";
    updates.push(
      "status = ?",
      "connection_error = NULL",
      "last_connected_at = ?",
      "last_status_at = ?",
      "qr_code = NULL",
      "qr_expires_at = NULL",
    );
    params.push(status, now, now);
    if (payload.me?.id) {
      updates.push("phone_number = ?");
      params.push(payload.me.id.replace(/@.*$/, ""));
    }
  } else if (raw === "FAILED" || raw === "STOPPED") {
    status = "disconnected";
    updates.push("status = ?", "last_status_at = ?");
    params.push(status, now);
  } else if (raw === "SCAN_QR_CODE" || raw === "STARTING") {
    status = "disconnected";
    updates.push("status = ?", "last_status_at = ?");
    params.push(status, now);
  }

  if (!status) return;
  params.push(instance.id);
  await dbRun(`UPDATE whatsapp_instances SET ${updates.join(", ")} WHERE id = ?`, ...params);
  emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id, status });
}

wahaWebhookRoute.post("/:instanceId", async (c) => {
  const instanceId = c.req.param("instanceId");
  const instance = await dbGet<InstanceRow>(
    "SELECT id, tenant_id, webhook_secret FROM whatsapp_instances WHERE id = ? LIMIT 1",
    instanceId,
  );

  if (!instance) {
    return c.json({ error: "Instance not found" }, 404);
  }

  const raw = await c.req.text();
  if (!verifyHmac(raw, c.req.header("x-webhook-hmac"))) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let body: WahaWebhookBody;
  try {
    body = raw ? (JSON.parse(raw) as WahaWebhookBody) : {};
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const event = body.event ?? "unknown";

  // Audit log every event for replay/debug.
  const logId = crypto.randomUUID();
  await dbRun(
    `INSERT INTO webhook_events_log (id, tenant_id, instance_id, event_type, payload, processed)
     VALUES (?, ?, ?, ?, ?, false)`,
    logId,
    instance.tenant_id,
    instance.id,
    event,
    raw,
  );

  const ingestInstance: IngestInstance = { id: instance.id, tenant_id: instance.tenant_id };

  try {
    if (event === "message" || event === "message.any") {
      const payload = body.payload as WahaMessagePayload;
      const mapped = mapWahaMessage(payload);

      let localMedia: string | null = null;
      if (mapped.mediaUrl) {
        localMedia = await downloadMedia(
          instance.tenant_id,
          mapped.mediaUrl,
          mapped.mediaMimeType ?? "application/octet-stream",
          mapped.mediaFilename,
        );
      }

      if (mapped.direction === "outbound") {
        await ingestOutboundSync(ingestInstance, mapped, localMedia);
      } else {
        const pushName = body.me?.pushName ?? null;
        // Persist the raw payload keyed by our message id for replay.
        const result = await ingestInbound(ingestInstance, mapped, pushName, localMedia);
        if (result.outcome === "inserted") {
          await dbRun(
            `INSERT INTO message_raw_payloads (message_id, raw_payload, provider_metadata)
             VALUES (?, ?, ?)
             ON CONFLICT DO NOTHING`,
            result.messageId,
            raw,
            JSON.stringify({ engine: "waha", session: body.session }),
          );
          fireInboundMessagePersisted({
            messageId: result.messageId,
            contactId: result.contactId,
            tenantId: instance.tenant_id,
            instanceId: instance.id,
            isNewContact: result.isNewContact,
            channel: "whatsapp",
          });
        }
      }
    } else if (event === "message.ack") {
      const payload = body.payload as WahaMessagePayload & { ack?: number };
      if (typeof payload.ack === "number") {
        await handleAck(payload, payload.ack, instance.tenant_id);
      }
    } else if (event === "session.status") {
      await handleSessionStatus(instance, body.payload as SessionStatusPayload);
    }

    await dbRun("UPDATE webhook_events_log SET processed = true WHERE id = ?", logId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ingest error";
    await dbRun("UPDATE webhook_events_log SET error = ? WHERE id = ?", message, logId);
    // Record internally; do NOT leak the raw error text to the (machine) caller.
    void captureError(error, {
      source: "backend",
      tenantId: instance.tenant_id,
      url: `/api/waha/webhook/${instanceId}`,
      meta: { event, logId },
    });
    return c.json({ error: "Webhook processing failed" }, 500);
  }

  return c.json({ success: true });
});
