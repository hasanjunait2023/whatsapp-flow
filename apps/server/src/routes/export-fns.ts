import { sqlite } from "../db/index.js";
import { toCsv } from "../services/export/csv.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Data-ownership exports — export-contacts, export-orders. Backs the landing
 * page "own + export your customer data" claim.
 *
 * Tenant isolation: every query filters on ctx.tenantId (resolved from the
 * session, never trusted from the body), so a caller only ever receives their
 * own rows. Admins are NOT special-cased here — an export is always the caller's
 * tenant, so even an impersonating admin exports the active tenant's data only.
 *
 * Returns the supabase-shaped { data, error } envelope; on success data is
 * { filename, csv, count } which the web download shim can save directly.
 */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

/** Hard cap so a huge tenant can't OOM the process building one CSV string. */
const MAX_ROWS = 50000;

function fail(message: string): FnResult {
  return { data: null, error: { message } };
}

/** YYYY-MM-DD for filenames. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

interface ContactRow {
  name: string | null;
  phone_number: string | null;
  wa_id: string | null;
  is_blocked: number;
  is_archived: number;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  labels: string | null;
}

/** export-contacts: CSV of the tenant's WhatsApp contacts with their labels. */
async function exportContacts(_body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.tenantId) return fail("No active tenant");

  // Labels live in contact_labels (contact_id, label_id) -> labels (id, name),
  // all tenant-scoped. group_concat collapses each contact's labels to one cell.
  const rows = sqlite
    .prepare(
      `SELECT
         c.name                AS name,
         c.phone_number        AS phone_number,
         c.wa_id               AS wa_id,
         c.is_blocked          AS is_blocked,
         c.is_archived         AS is_archived,
         c.unread_count        AS unread_count,
         c.last_message_at     AS last_message_at,
         c.created_at          AS created_at,
         (
           SELECT group_concat(l.name, '; ')
             FROM contact_labels cl
             JOIN labels l ON l.id = cl.label_id AND l.tenant_id = c.tenant_id
            WHERE cl.contact_id = c.id
         )                     AS labels
       FROM contacts c
      WHERE c.tenant_id = ?
      ORDER BY c.created_at DESC
      LIMIT ?`,
    )
    .all(ctx.tenantId, MAX_ROWS) as ContactRow[];

  const headers = [
    "name",
    "phone_number",
    "wa_id",
    "labels",
    "is_blocked",
    "is_archived",
    "unread_count",
    "last_message_at",
    "created_at",
  ];
  const data = rows.map((r) => [
    r.name,
    r.phone_number,
    r.wa_id,
    r.labels,
    r.is_blocked ? "yes" : "no",
    r.is_archived ? "yes" : "no",
    r.unread_count,
    r.last_message_at,
    r.created_at,
  ]);

  return {
    data: { filename: `contacts-${today()}.csv`, csv: toCsv(headers, data), count: rows.length },
    error: null,
  };
}

interface OrderRow {
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  payment_status: string;
  currency: string;
  subtotal: number;
  discount_amount: number | null;
  shipping_amount: number | null;
  total: number;
  source: string | null;
  created_at: string;
}

/** export-orders: CSV of the tenant's orders with totals + status. */
async function exportOrders(_body: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.tenantId) return fail("No active tenant");

  const rows = sqlite
    .prepare(
      `SELECT
         order_number, customer_name, customer_phone, customer_email,
         status, payment_status, currency, subtotal, discount_amount,
         shipping_amount, total, source, created_at
       FROM orders
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?`,
    )
    .all(ctx.tenantId, MAX_ROWS) as OrderRow[];

  const headers = [
    "order_number",
    "customer_name",
    "customer_phone",
    "customer_email",
    "status",
    "payment_status",
    "currency",
    "subtotal",
    "discount_amount",
    "shipping_amount",
    "total",
    "source",
    "created_at",
  ];
  const data = rows.map((r) => [
    r.order_number,
    r.customer_name,
    r.customer_phone,
    r.customer_email,
    r.status,
    r.payment_status,
    r.currency,
    r.subtotal,
    r.discount_amount ?? 0,
    r.shipping_amount ?? 0,
    r.total,
    r.source,
    r.created_at,
  ]);

  return {
    data: { filename: `orders-${today()}.csv`, csv: toCsv(headers, data), count: rows.length },
    error: null,
  };
}

export const EXPORT_HANDLERS: Record<string, FnHandler> = {
  "export-contacts": exportContacts,
  "export-orders": exportOrders,
};
