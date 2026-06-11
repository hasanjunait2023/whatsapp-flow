import { sqlite } from "../db/index.js";
import { emitChange } from "../realtime/emitter.js";
import { wahaClient, sessionNameForInstance } from "../waha/client.js";
import { WAHA_WEBHOOK_BASE_URL, WAHA_WEBHOOK_HMAC_SECRET } from "../lib/env.js";
import { generateTempPassword } from "../auth/password.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Privileged admin operations, wired into POST /api/fn/:name. EVERY handler is
 * gated on ctx.isAdmin and is legitimately cross-tenant; non-admins get 403-shaped
 * { error } envelopes. The destructive ones (delete-tenant, reset-password) fail
 * closed on a missing admin flag before touching anything.
 *
 * Ported from supabase/functions/admin-delete-tenant, admin-link-session,
 * admin-fix-webhook, admin-reset-user-password — retargeted from Wasender at the
 * WAHA session model and from Supabase Auth at better-auth credential accounts.
 */

const ok = (data: unknown): FnResult => ({ data, error: null });
const forbidden = (): FnResult => ok({ error: "Admin privileges required" });

const WEBHOOK_EVENTS = ["message", "message.ack", "session.status"];

function webhookUrlFor(instanceId: string): string {
  return `${WAHA_WEBHOOK_BASE_URL.replace(/\/+$/, "")}/api/waha/webhook/${instanceId}`;
}

// --- admin-delete-tenant -----------------------------------------------------

const PURGE_TABLES = [
  "messages",
  "webhook_events_log",
  "contact_thread_state",
  "orders",
  "contacts",
  "whatsapp_groups",
  "whatsapp_instances",
  "subscriptions",
  "subscription_orders",
  "payments",
  "user_roles",
];

interface TenantInstanceRow {
  id: string;
  session_id: string | null;
}

/** admin-delete-tenant: purge one or more tenants + their WAHA sessions. */
export async function adminDeleteTenant(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return forbidden();
  const tenantIds = raw.tenant_ids as string[] | undefined;
  if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
    return ok({ error: "tenant_ids array is required" });
  }

  const results: Array<{ tenant_id: string; success: boolean; sessions_deleted: number; error?: string }> = [];
  for (const tenantId of tenantIds) {
    try {
      // Delete WAHA sessions for the tenant's instances (idempotent on 404).
      const instances = sqlite
        .prepare("SELECT id, session_id FROM whatsapp_instances WHERE tenant_id = ?")
        .all(tenantId) as TenantInstanceRow[];
      let sessionsDeleted = 0;
      for (const inst of instances) {
        if (!inst.session_id) continue;
        try {
          await wahaClient.deleteSession(sessionNameForInstance(inst.id));
          sessionsDeleted += 1;
        } catch {
          // WAHA may already have dropped the session; not fatal to the purge.
        }
      }

      // Purge tenant-owned rows. Each predicate is scoped to this tenant_id.
      const tx = sqlite.transaction(() => {
        for (const table of PURGE_TABLES) {
          sqlite.prepare(`DELETE FROM ${table} WHERE tenant_id = ?`).run(tenantId);
        }
        sqlite.prepare("DELETE FROM tenants WHERE id = ?").run(tenantId);
      });
      tx();

      results.push({ tenant_id: tenantId, success: true, sessions_deleted: sessionsDeleted });
    } catch (err) {
      results.push({
        tenant_id: tenantId,
        success: false,
        sessions_deleted: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return ok({ success: results.every((r) => r.success), results });
}

// --- admin-reset-user-password -----------------------------------------------

/** admin-reset-user-password: rotate a user's credential to a temp password. */
export async function adminResetUserPassword(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return forbidden();
  const userId = raw.user_id as string | undefined;
  if (!userId) return ok({ success: false, error: "user_id is required" });

  const target = sqlite.prepare("SELECT id, email FROM user WHERE id = ? LIMIT 1").get(userId) as
    | { id: string; email: string | null }
    | undefined;
  if (!target) return ok({ success: false, error: "User not found" });

  const newPassword = generateTempPassword();
  let hash: string;
  try {
    const { hashPassword } = await import("better-auth/crypto");
    hash = await hashPassword(newPassword);
  } catch (err) {
    return ok({ success: false, error: err instanceof Error ? err.message : "Failed to hash password" });
  }

  const updated = sqlite
    .prepare("UPDATE account SET password = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'credential'")
    .run(hash, Math.floor(Date.now() / 1000), userId);
  if (updated.changes === 0) {
    return ok({ success: false, error: "No credential account found for this user" });
  }

  sqlite
    .prepare(
      "INSERT INTO admin_audit_logs (id, admin_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, 'reset_user_password', 'user', ?, ?, ?)",
    )
    .run(
      crypto.randomUUID(),
      ctx.userId,
      userId,
      JSON.stringify({ target_email: target.email, reset_at: new Date().toISOString() }),
      new Date().toISOString(),
    );

  return ok({ success: true, temp_password: newPassword, user_email: target.email });
}

// --- admin-link-session ------------------------------------------------------

interface LinkInstanceRow {
  id: string;
  tenant_id: string;
}

/** admin-link-session: bind an existing WAHA session to an instance. */
export async function adminLinkSession(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return forbidden();
  const instanceId = raw.instance_id as string | undefined;
  const sessionId = raw.session_id as string | undefined;
  if (!instanceId || !sessionId) return ok({ error: "instance_id and session_id are required" });

  const instance = sqlite
    .prepare("SELECT id, tenant_id FROM whatsapp_instances WHERE id = ? LIMIT 1")
    .get(instanceId) as LinkInstanceRow | undefined;
  if (!instance) return ok({ error: "Instance not found" });

  // Verify the session exists on WAHA before linking.
  let status = "disconnected";
  let phoneNumber: string | null = null;
  try {
    const session = await wahaClient.getSession(sessionId);
    status = session.status === "WORKING" ? "active" : "disconnected";
    phoneNumber = session.me?.id ? session.me.id.replace(/@.*$/, "") : null;
  } catch (err) {
    return ok({ error: err instanceof Error ? err.message : `Session ${sessionId} not found or inaccessible` });
  }

  const now = new Date().toISOString();
  sqlite
    .prepare("UPDATE whatsapp_instances SET session_id = ?, status = ?, phone_number = COALESCE(?, phone_number), updated_at = ? WHERE id = ?")
    .run(sessionId, status, phoneNumber, now, instance.id);

  // Clear the session from any OTHER instance that referenced it (de-dupe).
  const cleared = sqlite
    .prepare("UPDATE whatsapp_instances SET session_id = NULL, status = 'disconnected' WHERE session_id = ? AND id != ?")
    .run(sessionId, instance.id);
  emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id, status });

  return ok({
    success: true,
    message: "Session linked successfully",
    instance_id: instance.id,
    session_id: sessionId,
    phone_number: phoneNumber,
    status,
    webhook_url: webhookUrlFor(instance.id),
    duplicates_cleared: cleared.changes,
  });
}

// --- admin-fix-webhook -------------------------------------------------------

/** admin-fix-webhook: re-point the WAHA webhook at the correct instance URL. */
export async function adminFixWebhook(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return forbidden();
  const instanceId = raw.instance_id as string | undefined;
  const dryRun = raw.dry_run === true;
  if (!instanceId) return ok({ error: "instance_id is required" });

  const instance = sqlite
    .prepare("SELECT id, tenant_id, session_id, phone_number FROM whatsapp_instances WHERE id = ? LIMIT 1")
    .get(instanceId) as { id: string; tenant_id: string; session_id: string | null; phone_number: string | null } | undefined;
  if (!instance) return ok({ error: "Instance not found" });
  if (!instance.session_id) return ok({ error: "Instance has no session_id - cannot update webhook" });

  const correctWebhookUrl = webhookUrlFor(instance.id);
  const actions: Array<Record<string, unknown>> = [];

  if (dryRun) {
    actions.push({ action: "would_update_waha_webhook", session_id: instance.session_id, new_webhook_url: correctWebhookUrl });
    return ok({ success: true, dry_run: true, instance_id: instance.id, correct_webhook_url: correctWebhookUrl, actions });
  }

  try {
    await wahaClient.setWebhook(sessionNameForInstance(instance.id), correctWebhookUrl, WEBHOOK_EVENTS, WAHA_WEBHOOK_HMAC_SECRET || undefined);
    actions.push({ action: "waha_webhook_updated", session_id: instance.session_id, new_webhook_url: correctWebhookUrl });
  } catch (err) {
    return ok({ error: "Failed to update WAHA webhook", details: err instanceof Error ? err.message : "Unknown error" });
  }

  // De-dupe: clear the session from any other instance that shares it.
  const cleared = sqlite
    .prepare("UPDATE whatsapp_instances SET session_id = NULL, status = 'disconnected' WHERE session_id = ? AND id != ?")
    .run(instance.session_id, instance.id);
  if (cleared.changes > 0) {
    actions.push({ action: "sources_cleared", count: cleared.changes });
  }
  emitChange("whatsapp_instances", instance.tenant_id, { id: instance.id });

  return ok({
    success: true,
    dry_run: false,
    instance_id: instance.id,
    session_id: instance.session_id,
    correct_webhook_url: correctWebhookUrl,
    actions,
  });
}

export const ADMIN_HANDLERS = {
  "admin-delete-tenant": adminDeleteTenant,
  "admin-reset-user-password": adminResetUserPassword,
  "admin-link-session": adminLinkSession,
  "admin-fix-webhook": adminFixWebhook,
};
