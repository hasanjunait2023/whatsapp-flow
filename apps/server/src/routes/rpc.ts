import { Hono } from "hono";
import { dbGet, dbAll, dbRun, dbTx, type TxQuery } from "../db/raw.js";
import { getTenant } from "../middleware/tenant.js";
import { emitChange } from "../realtime/emitter.js";

// Sidebar unread badge — polled on every focus/mount. 5s TTL means at most one
// DB aggregate per tenant per 5s; SSE events still cause the frontend to
// re-request immediately, so perceived staleness is <5s under normal traffic.
const UNREAD_TTL = 5_000;
const unreadCache = new Map<string, { v: { wa_unread: number; fb_unread: number; total_unread: number }; exp: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of unreadCache) if (e.exp <= now) unreadCache.delete(k);
}, UNREAD_TTL).unref();

export function bustUnreadCache(tenantId: string): void {
  unreadCache.delete(tenantId);
}

export const rpcRoute = new Hono();

export interface RpcCtx {
  userId: string;
  tenantId: string | null;
  isAdmin: boolean;
}

type RpcHandler = (
  args: Record<string, unknown>,
  ctx: RpcCtx,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const ok = (data: unknown) => ({ data, error: null });
const fail = (message: string) => ({ data: null, error: { message } });

/** Upper bound on id arrays expanded into an IN(...) clause (DoS / variable cap). */
const MAX_IN_IDS = 500;

// contact_thread_state tenant membership is immutable — contacts don't move
// between tenants. Cache confirmed memberships for 5 min to avoid one DB hit
// per thread-message request at high concurrency. Only cache `true`; `false`
// (access denied) is not cached so new contacts are picked up immediately.
const contactTenantCache = new Map<string, { exp: number }>();
const CONTACT_TENANT_TTL = 5 * 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [k, e] of contactTenantCache) if (e.exp <= now) contactTenantCache.delete(k);
}, CONTACT_TENANT_TTL).unref();

/** Confirms a contact row belongs to the active tenant (or caller is admin). */
async function assertContactInTenant(contactId: string, ctx: RpcCtx): Promise<boolean> {
  if (ctx.isAdmin) return true;
  if (!ctx.tenantId) return false;
  const key = `${contactId}:${ctx.tenantId}`;
  const now = Date.now();
  const hit = contactTenantCache.get(key);
  if (hit && hit.exp > now) return true;
  const row = await dbGet(
    "SELECT 1 FROM contact_thread_state WHERE contact_id = ? AND tenant_id = ? LIMIT 1",
    contactId,
    ctx.tenantId,
  );
  if (row !== undefined) contactTenantCache.set(key, { exp: now + CONTACT_TENANT_TTL });
  return row !== undefined;
}

/**
 * get_last_messages_for_contacts(p_contact_ids text[])
 * Most recent message per contact id, tenant-scoped.
 * Shape: { contact_id, content, content_type, direction }.
 */
const getLastMessagesForContacts: RpcHandler = async (args, ctx) => {
  const ids = (args.p_contact_ids as string[]) ?? [];
  if (!Array.isArray(ids) || ids.length === 0) return ok([]);
  // Bound the IN(...) size: caps SQL variable count and prevents an abusive
  // caller from forcing a huge query. The inbox never needs more per page.
  if (ids.length > MAX_IN_IDS) return fail(`Too many ids (max ${MAX_IN_IDS})`);
  if (!ctx.tenantId && !ctx.isAdmin) return fail("No active tenant");

  const placeholders = ids.map(() => "?").join(",");
  const params: unknown[] = [...ids];
  let tenantClause = "";
  if (ctx.tenantId) {
    tenantClause = "AND m.tenant_id = ?";
    params.push(ctx.tenantId);
  }

  // DISTINCT ON with (contact_id, created_at) index: O(1) per contact.
  // ROW_NUMBER() scanned all messages per contact then filtered rn=1; DISTINCT ON
  // does a backwards index range scan and stops at the first (latest) row per contact.
  const rows = await dbAll(
    `SELECT DISTINCT ON (m.contact_id)
       m.contact_id, m.content, m.content_type, m.direction
     FROM messages m
     WHERE m.contact_id IN (${placeholders}) ${tenantClause}
     ORDER BY m.contact_id, m.created_at DESC`,
    ...params,
  );
  return ok(rows);
};

/**
 * get_inbox_contacts — keyset-paginated inbox list from contact_thread_state.
 * Mirrors the Postgres function: filters by type/assignment/archived/unread,
 * orders by (last_message_at, contact_id) desc, applies the keyset cursor.
 */
const getInboxContacts: RpcHandler = async (args, ctx) => {
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  if (!tenantId) return fail("No active tenant");
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");

  const contactType = (args.p_contact_type as string | null) ?? null;
  const assignedTo = (args.p_assigned_to as string | null) ?? null;
  const isArchived = (args.p_is_archived as boolean | null) ?? false;
  const unreadOnly = (args.p_unread_only as boolean | null) ?? false;
  const cursorTs = (args.p_cursor_timestamp as string | null) ?? null;
  const cursorId = (args.p_cursor_id as string | null) ?? null;
  const limit = (args.p_limit as number | null) ?? 50;

  const conds: string[] = ["tenant_id = ?", "is_archived = ?"];
  const params: unknown[] = [tenantId, isArchived];
  if (contactType) {
    conds.push("contact_type = ?");
    params.push(contactType);
  }
  if (assignedTo) {
    conds.push("assigned_to = ?");
    params.push(assignedTo);
  }
  if (unreadOnly) conds.push("unread_count > 0");
  if (cursorTs && cursorId) {
    // (last_message_at, contact_id) < (cursorTs, cursorId)
    conds.push("(last_message_at < ? OR (last_message_at = ? AND contact_id < ?))");
    params.push(cursorTs, cursorTs, cursorId);
  }
  params.push(limit);

  const rows = (await dbAll(
    `SELECT contact_id, contact_type, instance_id, contact_name, contact_phone,
              contact_avatar_url, last_message_at, last_message_preview,
              last_message_direction, last_message_type, unread_count, total_messages,
              assigned_to, is_archived, is_blocked, needs_handoff, handoff_reason,
              label_ids, created_at
       FROM contact_thread_state
       WHERE ${conds.join(" AND ")}
       ORDER BY last_message_at DESC, contact_id DESC
       LIMIT ?`,
    ...params,
  )) as Record<string, unknown>[];

  // label_ids is stored as JSON text; parse to an array for row-shape parity.
  for (const r of rows) {
    if (typeof r.label_ids === "string") {
      try {
        r.label_ids = JSON.parse(r.label_ids as string);
      } catch {
        r.label_ids = [];
      }
    }
    r.is_archived = !!r.is_archived;
    r.is_blocked = !!r.is_blocked;
    r.needs_handoff = !!r.needs_handoff;
  }
  return ok(rows);
};

/** Shared keyset thread-message reader for WhatsApp + Facebook. */
async function threadMessages(
  table: "messages" | "fb_messages",
  idColumn: "wa_message_id" | "mid",
  args: Record<string, unknown>,
  ctx: RpcCtx,
): Promise<{ data: unknown; error: { message: string } | null }> {
  const contactId = args.p_contact_id as string | undefined;
  if (!contactId) return fail("p_contact_id is required");
  if (!(await assertContactInTenant(contactId, ctx))) return fail("Forbidden contact");

  const cursorTs = (args.p_cursor_timestamp as string | null) ?? null;
  const cursorId = (args.p_cursor_id as string | null) ?? null;
  const limit = (args.p_limit as number | null) ?? 50;
  const direction = (args.p_direction as string | null) ?? "older";

  const conds: string[] = ["contact_id = ?"];
  const params: unknown[] = [contactId];
  // Defense in depth: scope to the caller's tenant even though the contact was
  // already verified in-tenant above (admins without a tenant read unscoped).
  if (ctx.tenantId) {
    conds.push("tenant_id = ?");
    params.push(ctx.tenantId);
  }
  if (cursorTs && cursorId) {
    if (direction === "older") {
      conds.push("(sent_at < ? OR (sent_at = ? AND id < ?))");
    } else {
      conds.push("(sent_at > ? OR (sent_at = ? AND id > ?))");
    }
    params.push(cursorTs, cursorTs, cursorId);
  }
  const orderDir = direction === "older" ? "DESC" : "ASC";
  params.push(limit);

  const mediaCols =
    table === "messages"
      ? "media_url, media_mime_type, media_filename, location_lat, location_lng,"
      : "media_url, media_mime_type, media_filename,";

  const rows = (await dbAll(
    `SELECT id, ${idColumn}, direction, status, content_type, content, text_preview,
              ${mediaCols} reply_to_id, is_from_ai, error_message,
              sent_at, delivered_at, read_at, sent_by_user_id
       FROM ${table}
       WHERE ${conds.join(" AND ")}
       ORDER BY sent_at ${orderDir}, id ${orderDir}
       LIMIT ?`,
    ...params,
  )) as Record<string, unknown>[];

  for (const r of rows) r.is_from_ai = !!r.is_from_ai;
  return ok(rows);
}

const getThreadMessages: RpcHandler = async (args, ctx) =>
  await threadMessages("messages", "wa_message_id", args, ctx);

const getFbThreadMessages: RpcHandler = async (args, ctx) =>
  await threadMessages("fb_messages", "mid", args, ctx);

/** mark_thread_as_read(p_contact_id) — zero the unread counter, emit SSE. */
const markThreadAsRead: RpcHandler = async (args, ctx) => {
  const contactId = args.p_contact_id as string | undefined;
  if (!contactId) return fail("p_contact_id is required");
  if (!(await assertContactInTenant(contactId, ctx))) return fail("Forbidden contact");
  const now = new Date().toISOString();
  if (ctx.tenantId) {
    await dbRun(
      "UPDATE contact_thread_state SET unread_count = 0, updated_at = ? WHERE contact_id = ? AND tenant_id = ?",
      now,
      contactId,
      ctx.tenantId,
    );
  } else {
    await dbRun(
      "UPDATE contact_thread_state SET unread_count = 0, updated_at = ? WHERE contact_id = ?",
      now,
      contactId,
    );
  }
  if (ctx.tenantId) unreadCache.delete(ctx.tenantId);
  emitChange("contact_thread_state", ctx.tenantId, { contact_id: contactId });
  return ok(null);
};

/** get_sidebar_unread_counts(p_tenant_id) — wa/fb/total unread aggregation. */
const getSidebarUnreadCounts: RpcHandler = async (args, ctx) => {
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  if (!tenantId) return fail("No active tenant");
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");
  const now = Date.now();
  const cached = unreadCache.get(tenantId);
  if (cached && cached.exp > now) return ok([cached.v]);
  const row = (await dbGet(
    `SELECT
         COALESCE(SUM(CASE WHEN contact_type = 'whatsapp' THEN unread_count ELSE 0 END), 0)::int AS wa_unread,
         COALESCE(SUM(CASE WHEN contact_type = 'facebook' THEN unread_count ELSE 0 END), 0)::int AS fb_unread,
         COALESCE(SUM(unread_count), 0)::int AS total_unread
       FROM contact_thread_state
       WHERE tenant_id = ? AND is_archived = false AND unread_count > 0`,
    tenantId,
  )) as { wa_unread: number; fb_unread: number; total_unread: number };
  unreadCache.set(tenantId, { v: row, exp: now + UNREAD_TTL });
  // Postgres returns a single-row table; the shim consumer reads data[0] OR data.
  return ok([row]);
};

/** is_system_admin() — admin role check for the active user.
 * ctx.isAdmin is already resolved and cached by tenantMiddleware; no DB hit needed. */
const isSystemAdmin: RpcHandler = async (_args, ctx) => ok(ctx.isAdmin);

/** is_super_admin() — super-admin role check for the active user. */
const isSuperAdmin: RpcHandler = async (_args, ctx) => {
  const row = await dbGet(
    "SELECT 1 FROM system_roles WHERE user_id = ? AND role = 'admin' AND is_super_admin = true LIMIT 1",
    ctx.userId,
  );
  return ok(row !== undefined);
};

/** get_admin_permissions() — JSON permissions for the active admin user. */
const getAdminPermissions: RpcHandler = async (_args, ctx) => {
  const row = (await dbGet(
    "SELECT permissions FROM system_roles WHERE user_id = ? AND role = 'admin' LIMIT 1",
    ctx.userId,
  )) as { permissions: string | null } | undefined;
  if (!row?.permissions) return ok({});
  try {
    return ok(typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions);
  } catch {
    return ok({});
  }
};

/** generate_order_number(p_tenant_id) — ORD-000001 style sequential number. */
const generateOrderNumber: RpcHandler = async (args, ctx) => {
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  if (!tenantId) return fail("No active tenant");
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");

  // Race-safe: a per-tenant counter row is bumped under a row lock inside a tx.
  // Seeding is idempotent (ON CONFLICT DO NOTHING).
  await dbRun(
    "INSERT INTO order_counters (tenant_id, next_order_number) VALUES (?, 1) ON CONFLICT (tenant_id) DO NOTHING",
    tenantId,
  );
  const seqRow = (await dbTx(async (tx) => {
    const cur = (await tx.get(
      "SELECT next_order_number FROM order_counters WHERE tenant_id = ? FOR UPDATE",
      tenantId,
    )) as { next_order_number: number } | undefined;
    if (!cur) throw new Error("order_counters seed vanished mid-transaction");
    await tx.run(
      "UPDATE order_counters SET next_order_number = next_order_number + 1 WHERE tenant_id = ?",
      tenantId,
    );
    return cur;
  })) as { next_order_number: number };
  const seq = seqRow.next_order_number.toString().padStart(6, "0");
  return ok(`ORD-${seq}`);
};

interface ProductStockRow {
  stock_quantity: number;
  track_inventory: boolean | null;
  tenant_id: string;
}

async function recordMovement(
  tenantId: string,
  productId: string,
  movementType: "in" | "out",
  qty: number,
  prev: number,
  next: number,
  reason: string,
  referenceType: string,
  referenceId: string | null,
  notes: string | null,
  userId: string | null,
  run: (sql: string, ...params: unknown[]) => Promise<{ changes: number }> = dbRun,
): Promise<void> {
  await run(
    `INSERT INTO stock_movements
         (id, tenant_id, product_id, movement_type, quantity, previous_quantity,
          new_quantity, reason, reference_type, reference_id, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    tenantId,
    productId,
    movementType,
    qty,
    prev,
    next,
    reason,
    referenceType,
    referenceId,
    notes,
    userId,
  );
}

/** deduct_product_stock — lower stock on sale and log the movement. */
const deductProductStock: RpcHandler = async (args, ctx) => {
  const productId = args.p_product_id as string | undefined;
  const quantity = args.p_quantity as number | undefined;
  const orderId = (args.p_order_id as string | null) ?? null;
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  if (!productId || quantity == null || !tenantId) return fail("Missing required args");
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");

  const product = (await dbGet(
    "SELECT stock_quantity, track_inventory, tenant_id FROM products WHERE id = ? LIMIT 1",
    productId,
  )) as ProductStockRow | undefined;
  if (!product) return fail("Product not found");
  if (!ctx.isAdmin && product.tenant_id !== ctx.tenantId) return fail("Forbidden product");
  if (!product.track_inventory) return ok(null);

  const userId = (args.p_user_id as string | null) ?? ctx.userId ?? null;
  // Atomic decrement: a single locked statement (CTE FOR UPDATE) computes the
  // new value in-DB so concurrent orders can't both read the same stock and
  // over-sell. Returns the true previous + new values for the movement log.
  const updated = (await dbGet(
    `WITH prev AS (SELECT stock_quantity AS old_qty FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE)
       UPDATE products p
          SET stock_quantity = GREATEST(0, p.stock_quantity - ?), updated_at = ?
         FROM prev
        WHERE p.id = ? AND p.tenant_id = ?
       RETURNING prev.old_qty AS previous_quantity, p.stock_quantity AS new_quantity`,
    productId,
    tenantId,
    quantity,
    new Date().toISOString(),
    productId,
    tenantId,
  )) as { previous_quantity: number; new_quantity: number } | undefined;
  if (!updated) return fail("Product not found");
  const current = updated.previous_quantity ?? 0;
  const next = updated.new_quantity ?? 0;
  await recordMovement(tenantId, productId, "out", -(current - next), current, next, "sale", "order", orderId, null, userId);
  emitChange("products", tenantId, { id: productId });
  return ok(null);
};

/** restore_stock_for_order — return stock for every item of an order. */
const restoreStockForOrder: RpcHandler = async (args, ctx) => {
  const orderId = args.p_order_id as string | undefined;
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  const reason = (args.p_reason as string | null) ?? "return";
  if (!orderId || !tenantId) return fail("Missing required args");
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");

  const order = (await dbGet(
    "SELECT tenant_id FROM orders WHERE id = ? LIMIT 1",
    orderId,
  )) as { tenant_id: string } | undefined;
  if (!order) return fail("Order not found");
  if (!ctx.isAdmin && order.tenant_id !== ctx.tenantId) return fail("Forbidden order");

  const items = (await dbAll(
    "SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL",
    orderId,
  )) as { product_id: string; quantity: number }[];
  const userId = (args.p_user_id as string | null) ?? ctx.userId ?? null;

  await dbTx(async (tx) => {
    for (const item of items) {
      // Atomic increment (locked single statement) so concurrent restores can't
      // lose an update. Only touches inventory-tracked products; returns the true
      // previous + new values for the movement log.
      const updated = (await tx.get(
        `WITH prev AS (SELECT stock_quantity AS old_qty FROM products WHERE id = ? AND tenant_id = ? AND track_inventory = true FOR UPDATE)
           UPDATE products p
              SET stock_quantity = p.stock_quantity + ?, updated_at = ?
             FROM prev
            WHERE p.id = ? AND p.tenant_id = ?
           RETURNING prev.old_qty AS previous_quantity, p.stock_quantity AS new_quantity`,
        item.product_id,
        tenantId,
        item.quantity,
        new Date().toISOString(),
        item.product_id,
        tenantId,
      )) as { previous_quantity: number; new_quantity: number } | undefined;
      if (!updated) continue; // missing or non-tracked product
      const current = updated.previous_quantity ?? 0;
      const next = updated.new_quantity ?? 0;
      await recordMovement(tenantId, item.product_id, "in", item.quantity, current, next, reason, "order", orderId, null, userId, tx.run);
    }
  });
  emitChange("products", tenantId, { order_id: orderId });
  return ok(null);
};

/** adjust_product_stock — manual add/remove/set; returns the new stock level. */
const adjustProductStock: RpcHandler = async (args, ctx) => {
  const productId = args.p_product_id as string | undefined;
  const tenantId = (args.p_tenant_id as string) ?? ctx.tenantId;
  const adjustmentType = args.p_adjustment_type as string | undefined;
  const quantity = args.p_quantity as number | undefined;
  const reason = (args.p_reason as string | null) ?? "manual_adjustment";
  const notes = (args.p_notes as string | null) ?? null;
  if (!productId || !tenantId || !adjustmentType || quantity == null) {
    return fail("Missing required args");
  }
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return fail("Forbidden tenant");

  // Race-safe: SELECT ... FOR UPDATE inside a tx pins the product row so the
  // computed "next" value is the authoritative value at commit time.
  const userId = (args.p_user_id as string | null) ?? ctx.userId ?? null;
  const result = await dbTx(async (tx) => {
    const product = (await tx.get(
      "SELECT stock_quantity, track_inventory, tenant_id FROM products WHERE id = ? AND tenant_id = ? FOR UPDATE",
      productId,
      tenantId,
    )) as ProductStockRow | undefined;
    if (!product) return { ok: false as const, error: "Product not found or wrong tenant" };

    const current = product.stock_quantity ?? 0;
    let next: number;
    let movementType: "in" | "out";
    let movementQty: number;
    if (adjustmentType === "add") {
      next = current + quantity;
      movementType = "in";
      movementQty = quantity;
    } else if (adjustmentType === "remove") {
      next = Math.max(0, current - quantity);
      movementType = "out";
      movementQty = -quantity;
    } else if (adjustmentType === "set") {
      next = quantity;
      if (quantity >= current) {
        movementType = "in";
        movementQty = quantity - current;
      } else {
        movementType = "out";
        movementQty = current - quantity;
      }
    } else {
      return { ok: false as const, error: `Invalid adjustment type: ${adjustmentType}` };
    }

    await tx.run(
      "UPDATE products SET stock_quantity = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
      next,
      new Date().toISOString(),
      productId,
      tenantId,
    );
    return {
      ok: true as const,
      next,
      movementType,
      movementQty,
      current,
    };
  });

  if (!result.ok) return fail(result.error);
  await recordMovement(
    tenantId,
    productId,
    result.movementType,
    result.movementQty,
    result.current,
    result.next,
    reason,
    "manual",
    null,
    notes,
    userId,
  );
  emitChange("products", tenantId, { id: productId });
  return ok(result.next);
};

const HANDLERS: Record<string, RpcHandler> = {
  get_last_messages_for_contacts: getLastMessagesForContacts,
  get_inbox_contacts: getInboxContacts,
  get_thread_messages: getThreadMessages,
  get_fb_thread_messages: getFbThreadMessages,
  mark_thread_as_read: markThreadAsRead,
  get_sidebar_unread_counts: getSidebarUnreadCounts,
  is_system_admin: isSystemAdmin,
  is_super_admin: isSuperAdmin,
  get_admin_permissions: getAdminPermissions,
  generate_order_number: generateOrderNumber,
  deduct_product_stock: deductProductStock,
  restore_stock_for_order: restoreStockForOrder,
  adjust_product_stock: adjustProductStock,
};

/** POST /api/rpc/:fn — Postgres RPC replacements, supabase-shaped envelope. */
rpcRoute.post("/:fn", async (c) => {
  const fn = c.req.param("fn");
  const handler = HANDLERS[fn];
  if (!handler) {
    return c.json({ data: null, error: { message: `Unknown RPC "${fn}"` } }, 404);
  }
  let args: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    args = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }
  const ctx = getTenant(c);
  const result = await handler(args, ctx);
  return c.json(result);
});
