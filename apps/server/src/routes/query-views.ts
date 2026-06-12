import { sqlite } from "../db/index.js";
import type { QueryRequest, QueryResponse } from "@whatsapp-flow/shared";
import type { TenantContext } from "../middleware/tenant.js";

/**
 * Read-only derived "views" the SPA queries via supabase.from(...).select().
 * These are Postgres VIEWs in the source schema (no base table), recomputed here
 * with a SQL SELECT. Tenant-scoped and SELECT-only.
 *
 * Currently: contact_customer_status — per-contact order/spend rollup joined to
 * the tenant's business type and the customer's score tier.
 * (port of supabase/migrations VIEW contact_customer_status.)
 */

export const VIRTUAL_VIEWS = new Set(["contact_customer_status"]);

export function isVirtualView(table: string): boolean {
  return VIRTUAL_VIEWS.has(table);
}

interface ContactStatusRow {
  contact_id: string;
  tenant_id: string;
  phone_number: string;
  business_type: string | null;
  total_orders: number;
  total_spent: number;
  score_tier: string | null;
  last_order_date: string | null;
  days_since_last_order: number | null;
}

/** Executes a SELECT against a virtual view. Only `select` is supported. */
export function executeView(req: QueryRequest, ctx: TenantContext): QueryResponse {
  if (req.op !== "select") {
    return { data: null, error: { message: "View is read-only", code: "readonly_table" } };
  }
  if (!ctx.tenantId && !ctx.isAdmin) {
    return { data: null, error: { message: "No active tenant", code: "no_tenant" } };
  }

  if (req.table === "contact_customer_status") {
    return contactCustomerStatus(req, ctx);
  }
  return { data: null, error: { message: `Unknown view "${req.table}"`, code: "table_not_allowed" } };
}

function contactCustomerStatus(req: QueryRequest, ctx: TenantContext): QueryResponse {
  const filters = req.filters ?? [];
  const conds: string[] = [];
  const params: unknown[] = [];

  // Force tenant scope (reject a mismatched client filter for non-admins).
  const tenantFilter = filters.find((f) => f.column === "tenant_id" && f.operator === "eq");
  if (tenantFilter && tenantFilter.value !== ctx.tenantId && !ctx.isAdmin) {
    return { data: null, error: { message: "Tenant filter mismatch", code: "tenant_mismatch" } };
  }
  if (ctx.tenantId) {
    conds.push("c.tenant_id = ?");
    params.push(ctx.tenantId);
  }

  // Support the consumer's `.in('contact_id', ids)` filter.
  const inFilter = filters.find((f) => f.column === "contact_id" && f.operator === "in");
  if (inFilter && Array.isArray(inFilter.value)) {
    const ids = inFilter.value as string[];
    if (ids.length === 0) return { data: [], error: null };
    // Bound the IN(...) expansion (SQL variable cap / DoS guard).
    if (ids.length > 500) {
      return { data: null, error: { message: "Too many contact_id values (max 500)", code: "too_many_ids" } };
    }
    conds.push(`c.id IN (${ids.map(() => "?").join(",")})`);
    params.push(...ids);
  }
  const eqContact = filters.find((f) => f.column === "contact_id" && f.operator === "eq");
  if (eqContact) {
    conds.push("c.id = ?");
    params.push(eqContact.value);
  }

  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = sqlite
    .prepare(
      `SELECT
         c.id AS contact_id,
         c.tenant_id AS tenant_id,
         c.phone_number AS phone_number,
         bt.slug AS business_type,
         COALESCE(cs.total_orders, 0) AS total_orders,
         COALESCE(cs.total_spent, 0) AS total_spent,
         cs.score_tier AS score_tier,
         cs.last_order_date AS last_order_date,
         CASE WHEN cs.last_order_date IS NOT NULL
           THEN CAST((julianday('now') - julianday(cs.last_order_date)) AS INTEGER)
           ELSE NULL END AS days_since_last_order
       FROM contacts c
       LEFT JOIN tenants t ON c.tenant_id = t.id
       LEFT JOIN business_types bt ON t.business_type_id = bt.id
       LEFT JOIN customer_scores cs ON cs.contact_id = c.id AND cs.tenant_id = c.tenant_id
       ${where}`,
    )
    .all(...params) as ContactStatusRow[];

  return { data: rows, error: null };
}
