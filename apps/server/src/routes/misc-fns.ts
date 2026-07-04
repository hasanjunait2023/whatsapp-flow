import { dbGet, dbAll, dbRun, dbTx } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { SESSION_HANDLERS } from "./waha/session.js";
import { sendMessage } from "./messaging.js";
import { enqueueJob } from "../jobs/queue.js";
import { BULK_SEND_JOB, type BulkSendPayload } from "../services/bulk-send.js";
import { proactiveSendDelayMs } from "../lib/pacing.js";
import { computeNumberHealth } from "../services/number-health.js";
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
// The aliases are intentionally admin-only (despite the inner fns not gating on
// isAdmin). A non-admin caller gets a proper 403 via fail(code="FORBIDDEN").
const adminWasenderCreate: typeof SESSION_HANDLERS[string] = async (raw, ctx) => {
  if (!ctx.isAdmin) return { data: null, error: { code: "FORBIDDEN", message: "Admin only" } };
  return SESSION_HANDLERS["wasender-create-session"](raw, ctx);
};
const adminWasenderConnect: typeof SESSION_HANDLERS[string] = async (raw, ctx) => {
  if (!ctx.isAdmin) return { data: null, error: { code: "FORBIDDEN", message: "Admin only" } };
  return SESSION_HANDLERS["wasender-connect-session"](raw, ctx);
};

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

  const instance = (await dbGet(
    "SELECT id, tenant_id, status FROM whatsapp_instances WHERE id = ? LIMIT 1",
    body.instance_id,
  )) as InstanceRow | undefined;
  if (!instance) return ok({ error: "Instance not found" });
  if (!ctx.isAdmin && instance.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden instance" });
  if (instance.status !== "active") return ok({ error: "Instance not connected" });

  // Resolve (or create) the target contact.
  let targetContactId = body.target_contact_id ?? null;
  if (!targetContactId && body.target_phone_number) {
    const normalized = body.target_phone_number.replace(/\D/g, "");
    const existing = (await dbGet(
      "SELECT id FROM contacts WHERE tenant_id = ? AND (phone_number = ? OR wa_id = ?) LIMIT 1",
      instance.tenant_id,
      normalized,
      `${normalized}@s.whatsapp.net`,
    )) as { id: string } | undefined;
    if (existing) {
      targetContactId = existing.id;
    } else {
      targetContactId = crypto.randomUUID();
      await dbRun(
        "INSERT INTO contacts (id, tenant_id, instance_id, phone_number, wa_id) VALUES (?, ?, ?, ?, ?)",
        targetContactId,
        instance.tenant_id,
        instance.id,
        normalized,
        `${normalized}@s.whatsapp.net`,
      );
      emitChange("contacts", instance.tenant_id, { id: targetContactId });
    }
  }
  if (!targetContactId) return ok({ error: "Could not resolve target contact" });
  // SECURITY: a client-supplied target_contact_id must belong to the instance's
  // tenant — never forward into another tenant's contact (created contacts above
  // already carry the right tenant_id, so this only gates the supplied path).
  const ownsTarget = await dbGet(
    "SELECT 1 FROM contacts WHERE id = ? AND tenant_id = ? LIMIT 1",
    targetContactId,
    instance.tenant_id,
  );
  if (!ownsTarget) return ok({ error: "Forbidden target contact" });

  // SECURITY: scope source-message reads to the caller's tenant so a tenant
  // cannot forward (and thus read) another tenant's message content/media.
  // Admins may forward cross-tenant only when an explicit source_tenant_id is
  // provided; otherwise admins are scoped to the resolving instance's tenant.
  const sourceTenant =
    ctx.isAdmin && typeof raw.source_tenant_id === "string"
      ? (raw.source_tenant_id as string)
      : instance.tenant_id;

  // Batch-fetch all source messages in one query (vs N sequential reads).
  const srcPlaceholders = messageIds.map(() => "?").join(",");
  const srcRows = (await dbAll(
    `SELECT id, content, content_type, media_url, media_filename
       FROM messages WHERE id IN (${srcPlaceholders}) AND tenant_id = ?`,
    ...messageIds,
    sourceTenant,
  )) as Array<{ id: string; content: string | null; content_type: string; media_url: string | null; media_filename: string | null }>;
  const srcMap = new Map(srcRows.map((r) => [r.id, r]));

  // ponytail: parallel sends — each message is independent, no ordering guarantee needed
  const results = await Promise.all(
    messageIds.map(async (mid) => {
      const src = srcMap.get(mid);
      if (!src) return { message_id: mid, success: false, error: "Source message not found" };
      const sendRes = await sendMessage(
        {
          contact_id: targetContactId!,
          instance_id: instance.id,
          content: src.content ?? undefined,
          content_type: src.content_type,
          media_url: src.media_url ?? undefined,
          media_filename: src.media_filename ?? undefined,
        },
        ctx,
      );
      const data = sendRes.data as { success?: boolean; error?: string; message_id?: string };
      return { message_id: mid, success: !!data?.success, error: data?.error };
    }),
  );
  return ok({ success: results.every((r) => r.success), results });
}

// --- whatsapp-refresh-profile ------------------------------------------------
export async function whatsappRefreshProfile(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const contactId = raw.contact_id as string | undefined;
  if (!contactId) return ok({ error: "contact_id is required" });
  const contact = (await dbGet(
    "SELECT id, tenant_id, profile_pic_synced_at FROM contacts WHERE id = ? LIMIT 1",
    contactId,
  )) as { id: string; tenant_id: string; profile_pic_synced_at: string | null } | undefined;
  if (!contact) return ok({ error: "Contact not found" });
  if (!ctx.isAdmin && contact.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden contact" });
  if (contact.profile_pic_synced_at) return ok({ success: true, skipped: true, reason: "already_synced" });

  // WAHA delivers profile pictures via the contacts endpoint; for v1 we only
  // stamp the sync time so the UI stops re-requesting. Full avatar fetch is a
  // follow-up (requires a WAHA /contacts/profile-picture call per number).
  await dbRun(
    "UPDATE contacts SET profile_pic_synced_at = ? WHERE id = ?",
    new Date().toISOString(),
    contact.id,
  );
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
  if (ids.length > 5000) return ok({ error: "contact_ids exceeds maximum of 5000 per call" });
  if (!ctx.tenantId) return ok({ error: "No active tenant" });

  // Drip, don't blast: enqueue one job per recipient with a staggered run_at so
  // sends go out spaced by a randomized human-like delay (uniform-cadence blasts
  // get WhatsApp numbers banned). Returns immediately — the scheduler delivers
  // over time. Each job renders spintax + merge fields (unique per recipient),
  // and the opt-out gate + per-number rate limit are enforced per send inside
  // sendMessage. Tip: put {first_name} / {a|b} variants in `content`.
  //
  // Offsets are computed with a synchronous .map() (preserving order), then all
  // INSERTs fire in parallel — avoids O(N) sequential DB round-trips on the
  // request thread at large batch sizes.
  const tenantId = ctx.tenantId; // string — guarded above
  const content = body.content as string; // string — guarded above

  // Validate all contact IDs belong to this tenant before enqueueing to prevent
  // queue pollution and timing-oracle attacks via foreign contact IDs.
  const validRows = await dbAll<{ id: string }>(
    `SELECT id FROM contacts WHERE id IN (${ids.map(() => "?").join(",")}) AND tenant_id = ?`,
    ...ids,
    tenantId,
  );
  const validIds = new Set(validRows.map((r) => r.id));
  const invalidIds = ids.filter((id) => !validIds.has(id));
  if (invalidIds.length > 0) {
    return ok({ error: "Some contact_ids do not belong to this tenant" });
  }

  let offsetMs = 0;
  const now = Date.now();
  await Promise.all(
    ids.map((contactId) => {
      offsetMs += proactiveSendDelayMs();
      return enqueueJob({
        kind: BULK_SEND_JOB,
        tenantId,
        runAt: new Date(now + offsetMs).toISOString(),
        payload: {
          tenantId,
          userId: ctx.userId,
          contactId,
          content,
          instanceId: body.instance_id,
        } satisfies BulkSendPayload,
      });
    }),
  );
  return ok({ success: true, queued: ids.length, total: ids.length });
}

// --- number-health (per-number ban-risk metrics) -----------------------------
// opted_out count is a full-table aggregate — cache 30s to avoid repeated scans.
const OPTED_OUT_TTL = 30_000;
const optedOutCache = new Map<string, { v: number; exp: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of optedOutCache) if (e.exp <= now) optedOutCache.delete(k);
}, OPTED_OUT_TTL).unref();

export async function numberHealth(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.tenantId) return ok({ error: "No active tenant" });
  const instanceId = (raw.instance_id as string | undefined) ?? null;
  const instances = await computeNumberHealth(ctx.tenantId, instanceId);

  const now = Date.now();
  const cached = optedOutCache.get(ctx.tenantId);
  let optedOutCount: number;
  if (cached && cached.exp > now) {
    optedOutCount = cached.v;
  } else {
    const row = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM contacts WHERE tenant_id = ? AND opted_out = true",
      ctx.tenantId,
    )) as { n: number } | undefined;
    optedOutCount = row?.n ?? 0;
    optedOutCache.set(ctx.tenantId, { v: optedOutCount, exp: now + OPTED_OUT_TTL });
  }

  return ok({ instances, opted_out_count: optedOutCount });
}

// --- create-admin-user (admin-only) ------------------------------------------
interface CreateAdminBody {
  user_id?: string;
  email?: string;
  is_super_admin?: boolean;
  permissions?: Record<string, unknown>;
}

export async function createAdminUser(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return { data: null, error: { code: "FORBIDDEN", message: "Admin privileges required" } };
  const body = raw as CreateAdminBody;
  let userId = body.user_id ?? null;
  if (!userId && body.email) {
    const u = (await dbGet("SELECT id FROM \"user\" WHERE lower(email) = lower(?) LIMIT 1", body.email)) as
      | { id: string }
      | undefined;
    userId = u?.id ?? null;
  }
  if (!userId) return ok({ error: "user_id or a known email is required" });

  const existing = (await dbGet(
    "SELECT id FROM system_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    userId,
  )) as { id: string } | undefined;
  const now = new Date().toISOString();
  if (existing) {
    await dbRun(
      "UPDATE system_roles SET is_super_admin = ?, permissions = ? WHERE id = ?",
      body.is_super_admin ? true : false,
      JSON.stringify(body.permissions ?? {}),
      existing.id,
    );
  } else {
    await dbRun(
      "INSERT INTO system_roles (id, user_id, role, is_super_admin, permissions, granted_at, granted_by, created_at) VALUES (?, ?, 'admin', ?, ?, ?, ?, ?)",
      crypto.randomUUID(),
      userId,
      body.is_super_admin ? true : false,
      JSON.stringify(body.permissions ?? {}),
      now,
      ctx.userId,
      now,
    );
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
  const order = (await dbGet(
    "SELECT id, tenant_id, order_number, total FROM orders WHERE id = ? LIMIT 1",
    orderId,
  )) as OrderRow | undefined;
  if (!order) return ok({ error: "Order not found" });
  if (!ctx.isAdmin && order.tenant_id !== ctx.tenantId) return ok({ error: "Forbidden order" });

  const existing = (await dbGet(
    "SELECT id, invoice_number FROM invoices WHERE order_id = ? LIMIT 1",
    orderId,
  )) as { id: string; invoice_number: string } | undefined;
  if (existing) {
    return ok({ success: true, invoice_id: existing.id, invoice_number: existing.invoice_number, reused: true });
  }

  // Invoice number from invoice_settings prefix + running counter.
  // Race-safe: bump-and-fetch in a single SQL with UPDATE ... RETURNING.
  // id is generated client-side because $defaultFn only fires for Drizzle inserts,
  // not raw SQL (raw SQL bypasses the defaultFn hook and would otherwise insert NULL id).
  const seedRow = (await dbGet(
    "INSERT INTO invoice_settings (id, tenant_id, invoice_prefix, next_invoice_number) VALUES (?, ?, 'INV-', 2) ON CONFLICT (tenant_id) DO NOTHING RETURNING next_invoice_number",
    crypto.randomUUID(),
    order.tenant_id,
  )) as { next_invoice_number: number } | undefined;

  const seqRow = (await dbTx(async (tx) => {
    // SELECT FOR UPDATE pins the row so concurrent calls serialise on it
    const cur = (await tx.get(
      "SELECT next_invoice_number FROM invoice_settings WHERE tenant_id = ? FOR UPDATE",
      order.tenant_id,
    )) as { next_invoice_number: number } | undefined;
    if (!cur) throw new Error("invoice_settings seed vanished mid-transaction");
    await tx.run(
      "UPDATE invoice_settings SET next_invoice_number = next_invoice_number + 1 WHERE tenant_id = ?",
      order.tenant_id,
    );
    return cur;
  })) as { next_invoice_number: number };

  // Discard seedRow result; we only care that the row exists.
  void seedRow;

  const prefix = "INV-";
  const seq = seqRow.next_invoice_number;
  const invoiceNumber = `${prefix}${String(seq).padStart(5, "0")}`;

  const invoiceId = crypto.randomUUID();
  // The counter has already been bumped (with row lock) above; here we just
  // insert the invoice row. No further UPDATE is needed.
  await dbTx(async (tx) => {
    await tx.run(
      "INSERT INTO invoices (id, tenant_id, order_id, invoice_number, total, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      invoiceId,
      order.tenant_id,
      order.id,
      invoiceNumber,
      order.total,
      new Date().toISOString(),
    );
  });
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
  const rows = (await dbAll(
    `SELECT id, total, tenant_id FROM invoices WHERE id IN (${placeholders}) ${tenantClause}`,
    ...params,
  )) as Array<{ id: string; total: number; tenant_id: string }>;
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
  "number-health": numberHealth,
  "create-admin-user": createAdminUser,
  "generate-invoice": generateInvoice,
  "merge-invoices": mergeInvoices,
};
