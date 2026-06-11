import { sqlite } from "../db/index.js";
import { emitChange } from "../realtime/emitter.js";
import { SESSION_HANDLERS } from "./waha/session.js";
import { sendMessage } from "./messaging.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Miscellaneous ported edge functions that don't warrant their own module:
 *  - admin-wasender-create/connect-session: admin aliases of the session fns
 *  - forward-message: resolve/create the target contact, then reuse send-message
 *  - whatsapp-refresh-profile: best-effort WA profile sync stamp
 *  - setup-byok-instance: BYOK is obsolete under WAHA (sessions, not API keys)
 *  - send-bulk-reminder: per-contact fan-out over send-message
 *  - create-admin-user: grant system_roles admin to an existing user (admin-only)
 *  - generate-invoice / merge-invoices: invoice rows (PDF render deferred)
 */

const ok = (data: unknown): FnResult => ({ data, error: null });

// --- Admin session aliases ---------------------------------------------------
const adminWasenderCreate = SESSION_HANDLERS["wasender-create-session"];
const adminWasenderConnect = SESSION_HANDLERS["wasender-connect-session"];

// --- forward-message ---------------------------------------------------------
interface ForwardBody {
  message_ids?: string[];
  instance_id?: string;
  target_contact_id?: string;
  target_phone_number?: string;
}

interface InstanceRow {
  id: string;
  tenant_id: string;
  status: string;
}

export async function forwardMessage(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as ForwardBody;
  const messageIds = body.message_ids ?? [];
  if (messageIds.length === 0) return ok({ error: "No messages to forward" });
  if (messageIds.length > 20) return ok({ error: "Maximum 20 messages can be forwarded at once" });
  if (!body.instance_id) return ok({ error: "instance_id is required" });
  if (!body.target_contact_id && !body.target_phone_number) {
    return ok({ error: "Either target_contact_id or target_phone_number is required" });
  }

  const instance = sqlite
    .prepare("SELECT id, tenant_id, status FROM whatsapp_instances WHERE id = ? LIMIT 1")
    .get(body.instance_id) as InstanceRow | undefined;
  if (!instance) return ok({ error: "Instance not found" });
  if (!ctx.isAdmin && instance.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden instance" });
  if (instance.status !== "active") return ok({ error: "Instance not connected" });

  // Resolve (or create) the target contact.
  let targetContactId = body.target_contact_id ?? null;
  if (!targetContactId && body.target_phone_number) {
    const normalized = body.target_phone_number.replace(/\D/g, "");
    const existing = sqlite
      .prepare(
        "SELECT id FROM contacts WHERE tenant_id = ? AND (phone_number = ? OR wa_id = ?) LIMIT 1",
      )
      .get(instance.tenant_id, normalized, `${normalized}@s.whatsapp.net`) as { id: string } | undefined;
    if (existing) {
      targetContactId = existing.id;
    } else {
      targetContactId = crypto.randomUUID();
      sqlite
        .prepare(
          "INSERT INTO contacts (id, tenant_id, instance_id, phone_number, wa_id) VALUES (?, ?, ?, ?, ?)",
        )
        .run(targetContactId, instance.tenant_id, instance.id, normalized, `${normalized}@s.whatsapp.net`);
      emitChange("contacts", instance.tenant_id, { id: targetContactId });
    }
  }
  if (!targetContactId) return ok({ error: "Could not resolve target contact" });

  const results: Array<{ message_id: string; success: boolean; error?: string }> = [];
  for (const mid of messageIds) {
    // SECURITY: scope the source-message read to the caller's tenant so a tenant
    // cannot forward (and thus read) another tenant's message content/media.
    // Admins may forward cross-tenant only when an explicit source_tenant_id is
    // provided; otherwise admins are scoped to the resolving instance's tenant.
    const sourceTenant =
      ctx.isAdmin && typeof raw.source_tenant_id === "string"
        ? (raw.source_tenant_id as string)
        : instance.tenant_id;
    const src = sqlite
      .prepare(
        "SELECT content, content_type, media_url, media_filename FROM messages WHERE id = ? AND tenant_id = ? LIMIT 1",
      )
      .get(mid, sourceTenant) as
      | { content: string | null; content_type: string; media_url: string | null; media_filename: string | null }
      | undefined;
    if (!src) {
      results.push({ message_id: mid, success: false, error: "Source message not found" });
      continue;
    }
    const sendRes = await sendMessage(
      {
        contact_id: targetContactId,
        instance_id: instance.id,
        content: src.content ?? undefined,
        content_type: src.content_type,
        media_url: src.media_url ?? undefined,
        media_filename: src.media_filename ?? undefined,
      },
      ctx,
    );
    const data = sendRes.data as { success?: boolean; error?: string; message_id?: string };
    results.push({ message_id: mid, success: !!data?.success, error: data?.error });
  }
  return ok({ success: results.every((r) => r.success), results });
}

// --- whatsapp-refresh-profile ------------------------------------------------
export async function whatsappRefreshProfile(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const contactId = raw.contact_id as string | undefined;
  if (!contactId) return ok({ error: "contact_id is required" });
  const contact = sqlite
    .prepare("SELECT id, tenant_id, profile_pic_synced_at FROM contacts WHERE id = ? LIMIT 1")
    .get(contactId) as { id: string; tenant_id: string; profile_pic_synced_at: string | null } | undefined;
  if (!contact) return ok({ error: "Contact not found" });
  if (!ctx.isAdmin && contact.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden contact" });
  if (contact.profile_pic_synced_at) return ok({ success: true, skipped: true, reason: "already_synced" });

  // WAHA delivers profile pictures via the contacts endpoint; for v1 we only
  // stamp the sync time so the UI stops re-requesting. Full avatar fetch is a
  // follow-up (requires a WAHA /contacts/profile-picture call per number).
  sqlite
    .prepare("UPDATE contacts SET profile_pic_synced_at = ? WHERE id = ?")
    .run(new Date().toISOString(), contact.id);
  return ok({ success: true, skipped: false });
}

// --- setup-byok-instance (obsolete under WAHA) -------------------------------
export async function setupByokInstance(): Promise<FnResult> {
  // Under WAHA, instances are session-based; there is no per-instance BYOK API
  // key. The UI path is retained but the feature is disabled in v1.
  return { data: null, error: { message: "feature_disabled_v1", code: "feature_disabled" } };
}

// --- send-bulk-reminder ------------------------------------------------------
interface BulkReminderBody {
  contact_ids?: string[];
  content?: string;
  instance_id?: string;
}

export async function sendBulkReminder(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as BulkReminderBody;
  const ids = body.contact_ids ?? [];
  if (ids.length === 0 || !body.content) return ok({ error: "contact_ids and content are required" });

  let sent = 0;
  let failed = 0;
  for (const contactId of ids) {
    const res = await sendMessage(
      { contact_id: contactId, content: body.content, content_type: "text", instance_id: body.instance_id },
      ctx,
    );
    const data = res.data as { success?: boolean };
    if (data?.success) sent++;
    else failed++;
  }
  return ok({ success: true, sent, failed, total: ids.length });
}

// --- create-admin-user (admin-only) ------------------------------------------
interface CreateAdminBody {
  user_id?: string;
  email?: string;
  is_super_admin?: boolean;
  permissions?: Record<string, unknown>;
}

export async function createAdminUser(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return ok({ error: "Admin privileges required" });
  const body = raw as CreateAdminBody;
  let userId = body.user_id ?? null;
  if (!userId && body.email) {
    const u = sqlite.prepare("SELECT id FROM user WHERE lower(email) = lower(?) LIMIT 1").get(body.email) as
      | { id: string }
      | undefined;
    userId = u?.id ?? null;
  }
  if (!userId) return ok({ error: "user_id or a known email is required" });

  const existing = sqlite
    .prepare("SELECT id FROM system_roles WHERE user_id = ? AND role = 'admin' LIMIT 1")
    .get(userId) as { id: string } | undefined;
  const now = new Date().toISOString();
  if (existing) {
    sqlite
      .prepare("UPDATE system_roles SET is_super_admin = ?, permissions = ? WHERE id = ?")
      .run(body.is_super_admin ? 1 : 0, JSON.stringify(body.permissions ?? {}), existing.id);
  } else {
    sqlite
      .prepare(
        "INSERT INTO system_roles (id, user_id, role, is_super_admin, permissions, granted_at, granted_by, created_at) VALUES (?, ?, 'admin', ?, ?, ?, ?, ?)",
      )
      .run(crypto.randomUUID(), userId, body.is_super_admin ? 1 : 0, JSON.stringify(body.permissions ?? {}), now, ctx.userId, now);
  }
  return ok({ success: true, user_id: userId });
}

// --- generate-invoice --------------------------------------------------------
interface OrderRow {
  id: string;
  tenant_id: string;
  order_number: string;
  total: number;
}

export async function generateInvoice(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const orderId = raw.order_id as string | undefined;
  if (!orderId) return ok({ error: "order_id is required" });
  const order = sqlite
    .prepare("SELECT id, tenant_id, order_number, total FROM orders WHERE id = ? LIMIT 1")
    .get(orderId) as OrderRow | undefined;
  if (!order) return ok({ error: "Order not found" });
  if (!ctx.isAdmin && order.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden order" });

  const existing = sqlite
    .prepare("SELECT id, invoice_number FROM invoices WHERE order_id = ? LIMIT 1")
    .get(orderId) as { id: string; invoice_number: string } | undefined;
  if (existing) {
    return ok({ success: true, invoice_id: existing.id, invoice_number: existing.invoice_number, reused: true });
  }

  // Invoice number from invoice_settings prefix + running counter.
  const settings = sqlite
    .prepare("SELECT invoice_prefix, next_invoice_number FROM invoice_settings WHERE tenant_id = ? LIMIT 1")
    .get(order.tenant_id) as { invoice_prefix: string | null; next_invoice_number: number | null } | undefined;
  const prefix = settings?.invoice_prefix ?? "INV-";
  const seq = settings?.next_invoice_number ?? 1;
  const invoiceNumber = `${prefix}${String(seq).padStart(5, "0")}`;

  const invoiceId = crypto.randomUUID();
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        "INSERT INTO invoices (id, tenant_id, order_id, invoice_number, total, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(invoiceId, order.tenant_id, order.id, invoiceNumber, order.total, new Date().toISOString());
    if (settings) {
      sqlite
        .prepare("UPDATE invoice_settings SET next_invoice_number = ? WHERE tenant_id = ?")
        .run(seq + 1, order.tenant_id);
    }
  });
  tx();
  emitChange("invoices", order.tenant_id, { order_id: order.id });

  // NOTE: PDF rendering (pdf_url) is deferred; the row + number are created so
  // the invoices list and "send invoice" flow work. pdf_url stays null until a
  // server-side renderer is added.
  return ok({ success: true, invoice_id: invoiceId, invoice_number: invoiceNumber, pdf_url: null });
}

// --- merge-invoices ----------------------------------------------------------
export async function mergeInvoices(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const invoiceIds = (raw.invoice_ids as string[]) ?? [];
  if (invoiceIds.length < 2) return ok({ error: "At least two invoice_ids are required" });
  if (!ctx.tenantId && !ctx.isAdmin) return ok({ error: "No active tenant" });

  const placeholders = invoiceIds.map(() => "?").join(",");
  const params: unknown[] = [...invoiceIds];
  let tenantClause = "";
  if (ctx.tenantId) {
    tenantClause = "AND tenant_id = ?";
    params.push(ctx.tenantId);
  }
  const rows = sqlite
    .prepare(`SELECT id, total, tenant_id FROM invoices WHERE id IN (${placeholders}) ${tenantClause}`)
    .all(...params) as Array<{ id: string; total: number; tenant_id: string }>;
  if (rows.length !== invoiceIds.length) return ok({ error: "Some invoices were not found in your tenant" });

  // Merged-PDF rendering is deferred; return the combined total + member list so
  // the UI can present a summary. A real merged pdf_url comes with the renderer.
  const total = rows.reduce((sum, r) => sum + (r.total ?? 0), 0);
  return ok({ success: true, merged_invoice_ids: invoiceIds, combined_total: total, pdf_url: null });
}

export const MISC_HANDLERS = {
  "admin-wasender-create-session": adminWasenderCreate,
  "admin-wasender-connect-session": adminWasenderConnect,
  "forward-message": forwardMessage,
  "whatsapp-refresh-profile": whatsappRefreshProfile,
  "setup-byok-instance": setupByokInstance,
  "send-bulk-reminder": sendBulkReminder,
  "create-admin-user": createAdminUser,
  "generate-invoice": generateInvoice,
  "merge-invoices": mergeInvoices,
};
