import { sqlite } from "../../db/index.js";
import { emitChange } from "../../realtime/emitter.js";
import {
  wahaClient,
  sessionNameForInstance,
  type WahaSessionStatus,
} from "../../waha/client.js";
import {
  WAHA_WEBHOOK_BASE_URL,
  WAHA_WEBHOOK_HMAC_SECRET,
} from "../../lib/env.js";

/**
 * WAHA session lifecycle handlers, wired into POST /api/fn/:name under the SAME
 * function names the frontend (useInstanceQR) already invokes, so the shim works
 * unchanged: wasender-create-session, wasender-connect-session,
 * wasender-get-qrcode, wasender-check-status, wasender-change-number,
 * wasender-update-webhook.
 */

export interface FnContext {
  userId: string;
  tenantId: string | null;
  isAdmin: boolean;
}

export type FnResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

const WEBHOOK_EVENTS = ["message", "message.ack", "session.status"];

interface InstanceRow {
  id: string;
  tenant_id: string;
  name: string | null;
  status: string;
  phone_number: string | null;
}

/** Loads an instance, enforcing tenant scope (admins bypass). */
function loadInstance(instanceId: string, ctx: FnContext): InstanceRow | { error: string } {
  const row = sqlite
    .prepare(
      "SELECT id, tenant_id, name, status, phone_number FROM whatsapp_instances WHERE id = ? LIMIT 1",
    )
    .get(instanceId) as InstanceRow | undefined;
  if (!row) return { error: "Instance not found" };
  if (!ctx.isAdmin && row.tenant_id !== ctx.tenantId) {
    return { error: "Forbidden instance" };
  }
  return row;
}

function webhookUrlFor(instanceId: string): string {
  const base = WAHA_WEBHOOK_BASE_URL.replace(/\/+$/, "");
  return `${base}/api/waha/webhook/${instanceId}`;
}

/** Maps a WAHA session status to our whatsapp_instances.status enum. */
function mapWahaStatus(status: WahaSessionStatus): string {
  if (status === "WORKING") return "active";
  return "disconnected";
}

/** wasender-create-session → create the instance row (if needed) + WAHA session. */
async function createSession(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const tenantId = (body.tenant_id as string) ?? ctx.tenantId;
  if (!tenantId) return { data: null, error: { message: "tenant_id is required" } };
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) {
    return { data: null, error: { message: "Forbidden tenant" } };
  }
  const phoneNumber = (body.phone_number as string) ?? null;

  // Reuse an existing instance without a session, else create a new row.
  let instance = sqlite
    .prepare(
      `SELECT id, tenant_id, name, status, phone_number FROM whatsapp_instances
       WHERE tenant_id = ? AND session_id IS NULL AND (is_deleted IS NULL OR is_deleted = 0)
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(tenantId) as InstanceRow | undefined;

  if (!instance) {
    const tenant = sqlite
      .prepare("SELECT name FROM tenants WHERE id = ? LIMIT 1")
      .get(tenantId) as { name: string } | undefined;
    const id = crypto.randomUUID();
    sqlite
      .prepare(
        `INSERT INTO whatsapp_instances (id, tenant_id, name, phone_number, status, is_default)
         VALUES (?, ?, ?, ?, 'disconnected', 1)`,
      )
      .run(id, tenantId, `${tenant?.name ?? "Tenant"} WhatsApp`, phoneNumber);
    instance = { id, tenant_id: tenantId, name: null, status: "disconnected", phone_number: phoneNumber };
  } else if (phoneNumber) {
    sqlite
      .prepare("UPDATE whatsapp_instances SET phone_number = ? WHERE id = ?")
      .run(phoneNumber, instance.id);
  }

  const sessionName = sessionNameForInstance(instance.id);
  try {
    await wahaClient.createSession(
      sessionName,
      webhookUrlFor(instance.id),
      WEBHOOK_EVENTS,
      WAHA_WEBHOOK_HMAC_SECRET || undefined,
    );
    sqlite
      .prepare("UPDATE whatsapp_instances SET session_id = ?, status = 'disconnected' WHERE id = ?")
      .run(sessionName, instance.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "WAHA create failed";
    return { data: null, error: { message } };
  }

  return {
    data: { message: "Session created", instance_id: instance.id, needs_connect: true },
    error: null,
  };
}

/** Stores the QR on the instance and emits SSE; shared by connect + get-qrcode. */
async function refreshQr(instance: InstanceRow): Promise<FnResult> {
  const sessionName = sessionNameForInstance(instance.id);
  try {
    // Ensure the session is started so a QR is available.
    const session = await wahaClient.getSession(sessionName).catch(() => null);
    if (!session || session.status === "STOPPED") {
      await wahaClient.startSession(sessionName).catch(() => undefined);
    }
    if (session?.status === "WORKING") {
      sqlite
        .prepare(
          "UPDATE whatsapp_instances SET status = 'active', qr_code = NULL, qr_expires_at = NULL WHERE id = ?",
        )
        .run(instance.id);
      emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id, status: "active" });
      return { data: { message: "Already connected", status: "active" }, error: null };
    }

    const { qr } = await wahaClient.getQr(sessionName);
    const expiresAt = new Date(Date.now() + 60000).toISOString();
    sqlite
      .prepare(
        "UPDATE whatsapp_instances SET qr_code = ?, qr_expires_at = ?, status = 'disconnected', connection_error = NULL WHERE id = ?",
      )
      .run(qr, expiresAt, instance.id);
    emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id });
    return { data: { qr_code: qr, expires_at: expiresAt }, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "QR fetch failed";
    return { data: null, error: { message } };
  }
}

/** wasender-connect-session / wasender-get-qrcode → start session + fetch QR. */
async function connectSession(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = body.instance_id as string;
  if (!instanceId) return { data: null, error: { message: "instance_id is required" } };
  const loaded = loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };
  return refreshQr(loaded);
}

/** wasender-check-status → getSession mapped to our status enum, persisted. */
async function checkStatus(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = body.instance_id as string;
  if (!instanceId) return { data: null, error: { message: "instance_id is required" } };
  const loaded = loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  try {
    const session = await wahaClient.getSession(sessionName);
    const newStatus = mapWahaStatus(session.status);
    const changed = newStatus !== loaded.status;
    if (changed) {
      if (newStatus === "active") {
        sqlite
          .prepare(
            "UPDATE whatsapp_instances SET status = 'active', qr_code = NULL, qr_expires_at = NULL, connection_error = NULL, last_connected_at = ?, last_status_at = ? WHERE id = ?",
          )
          .run(new Date().toISOString(), new Date().toISOString(), loaded.id);
      } else {
        sqlite
          .prepare("UPDATE whatsapp_instances SET status = ?, last_status_at = ? WHERE id = ?")
          .run(newStatus, new Date().toISOString(), loaded.id);
      }
      emitChange("whatsapp_instances", loaded.tenant_id, { id: loaded.id, status: newStatus });
    }
    return {
      data: { status: newStatus, waha_status: session.status, updated: changed },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status check failed";
    return { data: { status: loaded.status, error: message }, error: null };
  }
}

/** wasender-change-number → logout, clear session, recreate for a new number. */
async function changeNumber(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = body.instance_id as string;
  const newPhone = (body.new_phone_number as string) ?? "";
  if (!instanceId) return { data: null, error: { message: "Instance ID is required" } };
  const cleaned = newPhone.replace(/[\s\-()]/g, "");
  if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    return { data: null, error: { message: "Invalid phone number format" } };
  }
  const loaded = loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  await wahaClient.logout(sessionName).catch(() => undefined);
  sqlite
    .prepare(
      "UPDATE whatsapp_instances SET phone_number = ?, status = 'disconnected', qr_code = NULL, qr_expires_at = NULL, updated_at = ? WHERE id = ?",
    )
    .run(cleaned, new Date().toISOString(), loaded.id);
  emitChange("whatsapp_instances", loaded.tenant_id, { id: loaded.id, status: "disconnected" });

  return {
    data: {
      success: true,
      message: "Phone number updated. Scan the QR code to reconnect.",
      new_phone_number: cleaned,
    },
    error: null,
  };
}

/** wasender-update-webhook → re-register the webhook config on the WAHA session. */
async function updateWebhook(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = body.instance_id as string;
  if (!instanceId) return { data: null, error: { message: "instance_id is required" } };
  const loaded = loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  try {
    await wahaClient.createSession(
      sessionName,
      webhookUrlFor(loaded.id),
      WEBHOOK_EVENTS,
      WAHA_WEBHOOK_HMAC_SECRET || undefined,
    );
    return { data: { success: true, webhook_url: webhookUrlFor(loaded.id) }, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook update failed";
    return { data: null, error: { message } };
  }
}

export const SESSION_HANDLERS: Record<
  string,
  (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>
> = {
  "wasender-create-session": createSession,
  "wasender-connect-session": connectSession,
  "wasender-get-qrcode": connectSession,
  "wasender-check-status": checkStatus,
  "wasender-change-number": changeNumber,
  "wasender-update-webhook": updateWebhook,
};
