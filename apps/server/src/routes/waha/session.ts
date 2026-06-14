import { randomBytes } from "node:crypto";
import { dbGet, dbRun } from "../../db/raw.js";
import { emitChange } from "../../realtime/emitter.js";
import {
  wahaClient,
  sessionNameForInstance,
  type WahaSessionStatus,
} from "../../waha/client.js";
import { WAHA_WEBHOOK_BASE_URL } from "../../lib/env.js";

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
  webhook_secret: string | null;
}

/** Loads an instance, enforcing tenant scope (admins bypass). */
async function loadInstance(instanceId: string, ctx: FnContext): Promise<InstanceRow | { error: string }> {
  const row = (await dbGet(
    "SELECT id, tenant_id, name, status, phone_number, webhook_secret FROM whatsapp_instances WHERE id = ? LIMIT 1",
    instanceId,
  )) as InstanceRow | undefined;
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

/**
 * Returns the instance's per-instance webhook HMAC secret, generating and
 * persisting one if absent. Defense-in-depth: each WAHA session signs with its
 * own key rather than a single shared global, so a leaked key can't forge events
 * for other instances. Mutates `instance.webhook_secret` so the caller can pass
 * the fresh value to WAHA in the same flow.
 */
async function ensureWebhookSecret(instance: InstanceRow): Promise<string> {
  if (instance.webhook_secret) return instance.webhook_secret;
  const secret = randomBytes(32).toString("hex");
  await dbRun(
    "UPDATE whatsapp_instances SET webhook_secret = ? WHERE id = ?",
    secret,
    instance.id,
  );
  instance.webhook_secret = secret;
  return secret;
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
  let instance = (await dbGet(
    `SELECT id, tenant_id, name, status, phone_number, webhook_secret FROM whatsapp_instances
       WHERE tenant_id = ? AND session_id IS NULL AND (is_deleted IS NOT TRUE)
       ORDER BY created_at DESC LIMIT 1`,
    tenantId,
  )) as InstanceRow | undefined;

  if (!instance) {
    // Enforce the plan's instance cap before provisioning a new number.
    // Without this a tenant could loop create-session to provision unlimited
    // instances regardless of their subscription (billing bypass). Admins
    // (incl. impersonation) bypass so support can provision on a tenant's behalf.
    if (!ctx.isAdmin) {
      const planRow = (await dbGet(
        `SELECT COALESCE(p.max_instances, 1) AS max
             FROM subscriptions s JOIN plans p ON p.id = s.plan_id
            WHERE s.tenant_id = ? AND s.status IN ('active','trialing','past_due')
            ORDER BY s.created_at DESC LIMIT 1`,
        tenantId,
      )) as { max: number } | undefined;
      const cap = planRow?.max ?? 1;
      const live = (await dbGet(
        `SELECT COUNT(*)::int AS n FROM whatsapp_instances
            WHERE tenant_id = ? AND (is_deleted IS NOT TRUE)`,
        tenantId,
      )) as { n: number };
      if (live.n >= cap) {
        return {
          data: null,
          error: {
            message: `Instance limit reached (${cap}). Upgrade your plan to add more numbers.`,
            code: "INSTANCE_LIMIT_REACHED",
          },
        };
      }
    }

    const tenant = (await dbGet(
      "SELECT name FROM tenants WHERE id = ? LIMIT 1",
      tenantId,
    )) as { name: string } | undefined;
    const id = crypto.randomUUID();
    await dbRun(
      `INSERT INTO whatsapp_instances (id, tenant_id, name, phone_number, status, is_default)
         VALUES (?, ?, ?, ?, 'disconnected', true)`,
      id,
      tenantId,
      `${tenant?.name ?? "Tenant"} WhatsApp`,
      phoneNumber,
    );
    instance = { id, tenant_id: tenantId, name: null, status: "disconnected", phone_number: phoneNumber, webhook_secret: null };
  } else if (phoneNumber) {
    await dbRun(
      "UPDATE whatsapp_instances SET phone_number = ? WHERE id = ?",
      phoneNumber,
      instance.id,
    );
  }

  const sessionName = sessionNameForInstance(instance.id);
  try {
    const hmacSecret = await ensureWebhookSecret(instance);
    await wahaClient.createSession(
      sessionName,
      webhookUrlFor(instance.id),
      WEBHOOK_EVENTS,
      hmacSecret,
    );
    await dbRun(
      "UPDATE whatsapp_instances SET session_id = ?, status = 'disconnected' WHERE id = ?",
      sessionName,
      instance.id,
    );
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
    if (session?.status === "WORKING") {
      await dbRun(
        "UPDATE whatsapp_instances SET status = 'active', qr_code = NULL, qr_expires_at = NULL WHERE id = ?",
        instance.id,
      );
      emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id, status: "active" });
      return { data: { message: "Already connected", status: "active" }, error: null };
    }
    // A FAILED session never produces a QR (auth/qr -> 422) and never recovers
    // on its own, so a stop+start is required to get back to SCAN_QR_CODE.
    if (session?.status === "FAILED") {
      await wahaClient.stopSession(sessionName).catch(() => undefined);
      await wahaClient.startSession(sessionName).catch(() => undefined);
    } else if (!session || session.status === "STOPPED") {
      await wahaClient.startSession(sessionName).catch(() => undefined);
    }

    // Right after start the session is STARTING; auth/qr only works once it
    // reaches SCAN_QR_CODE. Poll briefly so the first open returns a real QR
    // instead of a 422 the user would see as an error.
    let ready = session?.status === "SCAN_QR_CODE";
    for (let i = 0; i < 8 && !ready; i++) {
      await new Promise((r) => setTimeout(r, 750));
      const s = await wahaClient.getSession(sessionName).catch(() => null);
      if (s?.status === "WORKING") {
        await dbRun(
          "UPDATE whatsapp_instances SET status = 'active', qr_code = NULL, qr_expires_at = NULL WHERE id = ?",
          instance.id,
        );
        emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id, status: "active" });
        return { data: { message: "Already connected", status: "active" }, error: null };
      }
      ready = s?.status === "SCAN_QR_CODE";
    }

    const { qr } = await wahaClient.getQr(sessionName);
    // WhatsApp rotates the linking QR roughly every ~20s; a stored 60s window
    // made the UI show a code that WhatsApp had already invalidated ("invalid"
    // on scan). Keep the stored validity in step with the real rotation so the
    // client refreshes before the code dies.
    const expiresAt = new Date(Date.now() + 20000).toISOString();
    await dbRun(
      "UPDATE whatsapp_instances SET qr_code = ?, qr_expires_at = ?, status = 'disconnected', connection_error = NULL WHERE id = ?",
      qr,
      expiresAt,
      instance.id,
    );
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
  const loaded = await loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };
  return refreshQr(loaded);
}

/** wasender-check-status → getSession mapped to our status enum, persisted. */
async function checkStatus(body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const instanceId = body.instance_id as string;
  if (!instanceId) return { data: null, error: { message: "instance_id is required" } };
  const loaded = await loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  try {
    const session = await wahaClient.getSession(sessionName);
    const newStatus = mapWahaStatus(session.status);
    const changed = newStatus !== loaded.status;
    if (changed) {
      if (newStatus === "active") {
        await dbRun(
          "UPDATE whatsapp_instances SET status = 'active', qr_code = NULL, qr_expires_at = NULL, connection_error = NULL, last_connected_at = ?, last_status_at = ?, warmup_started_at = COALESCE(warmup_started_at, ?) WHERE id = ?",
          new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString(),
          loaded.id,
        );
      } else {
        await dbRun(
          "UPDATE whatsapp_instances SET status = ?, last_status_at = ? WHERE id = ?",
          newStatus,
          new Date().toISOString(),
          loaded.id,
        );
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
  const loaded = await loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  await wahaClient.logout(sessionName).catch(() => undefined);
  await dbRun(
    "UPDATE whatsapp_instances SET phone_number = ?, status = 'disconnected', qr_code = NULL, qr_expires_at = NULL, updated_at = ? WHERE id = ?",
    cleaned,
    new Date().toISOString(),
    loaded.id,
  );
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
  const loaded = await loadInstance(instanceId, ctx);
  if ("error" in loaded) return { data: null, error: { message: loaded.error } };

  const sessionName = sessionNameForInstance(loaded.id);
  try {
    const hmacSecret = await ensureWebhookSecret(loaded);
    await wahaClient.createSession(
      sessionName,
      webhookUrlFor(loaded.id),
      WEBHOOK_EVENTS,
      hmacSecret,
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
