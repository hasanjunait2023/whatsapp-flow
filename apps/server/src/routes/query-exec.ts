import {
  and,
  or,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  like,
  inArray,
  isNull,
  isNotNull,
  sql,
  asc,
  desc,
  type SQL,
} from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";
import type {
  QueryRequest,
  QueryFilter,
  QueryResponse,
} from "@whatsapp-flow/shared";
import { db } from "../db/index.js";
import { QUERY_TABLES, isAllowedTable, type TableConfig } from "./query-tables.js";
import { parseSelect, hasEmbeds, hydrateEmbeds } from "./query-embed.js";
import { isVirtualView, executeView } from "./query-views.js";
import type { TenantContext } from "../middleware/tenant.ts";

class QueryError extends Error {
  code: string;
  constructor(message: string, code = "query_error") {
    super(message);
    this.code = code;
  }
}

function getColumn(cfg: TableConfig, name: string) {
  const cols = getTableColumns(cfg.table) as Record<string, any>;
  const col = cols[name];
  if (!col) {
    throw new QueryError(`Unknown column "${name}"`, "unknown_column");
  }
  return col;
}

function buildFilter(cfg: TableConfig, f: QueryFilter): SQL {
  const col = getColumn(cfg, f.column);
  switch (f.operator) {
    case "eq":
      return eq(col, f.value);
    case "neq":
      return ne(col, f.value);
    case "gt":
      return gt(col, f.value);
    case "gte":
      return gte(col, f.value);
    case "lt":
      return lt(col, f.value);
    case "lte":
      return lte(col, f.value);
    case "like":
      return like(col, String(f.value));
    case "ilike":
      // SQLite LIKE is case-insensitive for ASCII by default.
      return like(col, String(f.value));
    case "in":
      return inArray(col, (f.value as unknown[]) ?? []);
    case "is":
      return f.value === null ? isNull(col) : eq(col, f.value);
    case "contains": {
      // jsonb/text[] contains — fall back to substring match on the JSON text.
      return sql`${col} LIKE ${"%" + JSON.stringify(f.value).slice(1, -1) + "%"}`;
    }
    case "match":
      return eq(col, f.value);
    case "not": {
      const inner = f.negatedOperator ?? "eq";
      if (inner === "is" && f.value === null) return isNotNull(col);
      if (inner === "eq") return ne(col, f.value);
      if (inner === "in") return sql`${col} NOT IN ${f.value}`;
      throw new QueryError(`Unsupported not(${inner})`, "unsupported_filter");
    }
    default:
      throw new QueryError(`Unsupported operator "${f.operator}"`, "unsupported_filter");
  }
}

/**
 * Enforces tenant isolation:
 *  - tenant-scoped tables: rejects client tenant filters that mismatch ctx, then
 *    forces tenant_id = ctx.tenantId.
 *  - profiles: scoped to own id unless admin.
 *  - tenants: scoped to tenants the user belongs to (or ctx tenant) unless admin.
 *  - user_roles / system_roles: scoped to own user_id unless admin.
 */
function tenantScope(
  cfg: TableConfig,
  tableName: string,
  ctx: TenantContext,
  filters: QueryFilter[],
): SQL[] {
  const conds: SQL[] = [];

  if (cfg.tenantColumn) {
    const supplied = filters.find(
      (f) => f.column === cfg.tenantColumn && f.operator === "eq",
    );
    if (supplied && supplied.value !== ctx.tenantId && !ctx.isAdmin) {
      throw new QueryError("Tenant filter mismatch", "tenant_mismatch");
    }
    if (!ctx.tenantId && !ctx.isAdmin) {
      throw new QueryError("No active tenant", "no_tenant");
    }
    if (ctx.tenantId) {
      conds.push(eq(getColumn(cfg, cfg.tenantColumn), ctx.tenantId));
    }
    return conds;
  }

  // Junction tables with no tenant_id: scope through a parent row owned by the
  // caller's tenant (the row is visible/mutable only when its FK points at one).
  if (cfg.tenantViaParent) {
    if (ctx.isAdmin) return conds;
    if (!ctx.tenantId) {
      throw new QueryError("No active tenant", "no_tenant");
    }
    const { fkColumn, parentTable } = cfg.tenantViaParent;
    const parentCfg = QUERY_TABLES[parentTable];
    const parentCols = getTableColumns(parentCfg.table) as Record<string, any>;
    conds.push(
      inArray(
        getColumn(cfg, fkColumn),
        db
          .select({ id: parentCols.id })
          .from(parentCfg.table as any)
          .where(eq(parentCols.tenant_id, ctx.tenantId)),
      ),
    );
    return conds;
  }

  if (ctx.isAdmin) return conds;

  switch (cfg.access) {
    case "own-profile":
      conds.push(eq(getColumn(cfg, "id"), ctx.userId));
      break;
    case "own-tenant":
      if (ctx.tenantId) conds.push(eq(getColumn(cfg, "id"), ctx.tenantId));
      else throw new QueryError("No active tenant", "no_tenant");
      break;
    case "membership":
      conds.push(eq(getColumn(cfg, "user_id"), ctx.userId));
      break;
    default:
      break;
  }
  return conds;
}

function forceTenantOnRow(
  cfg: TableConfig,
  ctx: TenantContext,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (cfg.tenantColumn && ctx.tenantId) {
    return { ...row, [cfg.tenantColumn]: ctx.tenantId };
  }
  return row;
}

const MUTATION_OPS = new Set(["insert", "update", "upsert", "delete"]);

/**
 * Central mutation gate. Enforces the per-table `mutability` flag:
 *  - "readonly": never mutable via the generic API
 *  - "admin":    only admins may mutate (privilege-bearing tables)
 *  - "tenant":   any authenticated tenant member may mutate
 *
 * Rejecting here closes the IDOR / privilege-escalation path where a non-admin
 * could insert/update their own role-bearing rows (user_roles, system_roles).
 */
function assertMutable(cfg: TableConfig, op: string, ctx: TenantContext): void {
  if (!MUTATION_OPS.has(op)) return;
  const mutability = cfg.mutability ?? "tenant";
  if (mutability === "readonly") {
    throw new QueryError("Table is read-only via this API", "readonly_table");
  }
  if (mutability === "admin" && !ctx.isAdmin) {
    throw new QueryError("Admin privileges required", "forbidden");
  }
}

/**
 * Defense in depth for insert/upsert rows: non-admins may not write privilege
 * columns, and on membership tables may only write rows for themselves.
 */
function assertRowAllowed(
  cfg: TableConfig,
  ctx: TenantContext,
  row: Record<string, unknown>,
): void {
  if (ctx.isAdmin) return;
  for (const col of cfg.privilegeColumns ?? []) {
    if (col in row) {
      throw new QueryError(`Forbidden field "${col}"`, "forbidden");
    }
  }
  if (cfg.access === "membership" && "user_id" in row && row.user_id !== ctx.userId) {
    throw new QueryError("Cannot write rows for another user", "forbidden");
  }
}

/**
 * Defense in depth for junction tables scoped via a parent (tenantViaParent):
 * a non-admin may only insert/upsert a row whose FK points at a parent owned by
 * their tenant — closing the cross-tenant *write* path that read-side scoping
 * alone leaves open (e.g. tagging another tenant's contact via contact_labels).
 */
async function assertViaParentAllowed(
  cfg: TableConfig,
  ctx: TenantContext,
  row: Record<string, unknown>,
): Promise<void> {
  if (ctx.isAdmin || !cfg.tenantViaParent) return;
  if (!ctx.tenantId) throw new QueryError("No active tenant", "no_tenant");
  const { fkColumn, parentTable } = cfg.tenantViaParent;
  const fk = row[fkColumn];
  if (typeof fk !== "string" || !fk) {
    throw new QueryError(`"${fkColumn}" is required`, "forbidden");
  }
  const parentCfg = QUERY_TABLES[parentTable];
  const parentCols = getTableColumns(parentCfg.table) as Record<string, any>;
  const found = (await db
    .select({ id: parentCols.id })
    .from(parentCfg.table as any)
    .where(and(eq(parentCols.id, fk), eq(parentCols.tenant_id, ctx.tenantId)))) as unknown[];
  if (found.length === 0) {
    throw new QueryError("Forbidden parent row", "forbidden");
  }
}

/** Blocklist privilege columns from update patches for non-admins. */
function assertPatchAllowed(
  cfg: TableConfig,
  ctx: TenantContext,
  patch: Record<string, unknown>,
): void {
  if (ctx.isAdmin) return;
  for (const col of cfg.privilegeColumns ?? []) {
    if (col in patch) {
      throw new QueryError(`Forbidden field "${col}"`, "forbidden");
    }
  }
}

function applyColumnSelection(
  rows: Record<string, unknown>[],
  columns?: string,
  keepKeys: string[] = [],
): Record<string, unknown>[] {
  if (!columns || columns.trim() === "*" || columns.trim() === "") return rows;
  const wanted = columns
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const all = [...wanted, ...keepKeys];
  return rows.map((r) => {
    const out: Record<string, unknown> = {};
    for (const c of all) out[c] = r[c];
    return out;
  });
}

/**
 * SECURITY: strips configured secret columns from outgoing rows. Applied to
 * every SELECT result and every insert/update `returning` projection so tokens,
 * keys and secrets never leave the server via /api/query — including when the
 * client requested "*" or named the column explicitly.
 */
function redactRows(
  cfg: TableConfig,
  rows: Record<string, unknown>[],
): Record<string, unknown>[] {
  const secret = cfg.redactColumns;
  if (!secret || secret.length === 0) return rows;
  return rows.map((r) => {
    const out = { ...r };
    for (const col of secret) delete out[col];
    return out;
  });
}

export async function executeQuery(
  req: QueryRequest,
  ctx: TenantContext,
): Promise<QueryResponse> {
  try {
    // Derived read-only views (e.g. contact_customer_status) are computed, not
    // backed by a base table; dispatch before the allowlist check.
    if (isVirtualView(req.table)) {
      return executeView(req, ctx);
    }
    if (!isAllowedTable(req.table)) {
      throw new QueryError(`Table "${req.table}" is not allowed`, "table_not_allowed");
    }
    const cfg = QUERY_TABLES[req.table];
    assertMutable(cfg, req.op, ctx);
    const filters = req.filters ?? [];
    const scope = tenantScope(cfg, req.table, ctx, filters);
    const userConds = filters.map((f) => buildFilter(cfg, f));
    const whereParts = [...scope, ...userConds];
    const where = whereParts.length > 0 ? and(...whereParts) : undefined;

    if (req.op === "select") {
      return await runSelect(req, cfg, where, ctx);
    }
    if (req.op === "insert") {
      return await runInsert(req, cfg, ctx);
    }
    if (req.op === "update") {
      return await runUpdate(req, cfg, ctx, where);
    }
    if (req.op === "delete") {
      return await runDelete(req, cfg, where);
    }
    if (req.op === "upsert") {
      return await runUpsert(req, cfg, ctx);
    }
    throw new QueryError(`Unsupported op "${req.op}"`, "unsupported_op");
  } catch (err) {
    if (err instanceof QueryError) {
      return { data: null, error: { message: err.message, code: err.code } };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: { message } };
  }
}

async function runSelect(
  req: QueryRequest,
  cfg: TableConfig,
  where: SQL | undefined,
  ctx: TenantContext,
): Promise<QueryResponse> {
  // head:true => count-only request, no rows.
  if (req.head) {
    const countRows = await db
      .select({ n: sql<number>`count(*)` })
      .from(cfg.table as any)
      .where(where ?? sql`1=1`);
    return { data: null, error: null, count: Number(countRows[0]?.n ?? 0) };
  }

  let q = db.select().from(cfg.table as any);
  if (where) q = q.where(where) as any;

  if (req.order) {
    const orderExprs = req.order.map((o) => {
      const col = getColumn(cfg, o.column);
      return o.ascending ? asc(col) : desc(col);
    });
    if (orderExprs.length) q = q.orderBy(...orderExprs) as any;
  }

  const hasRange = req.rangeFrom != null && req.rangeTo != null;
  if (hasRange) {
    q = q.limit(req.rangeTo! - req.rangeFrom! + 1).offset(req.rangeFrom!) as any;
  } else {
    if (req.limit != null) q = q.limit(req.limit) as any;
    if (req.offset != null) q = q.offset(req.offset) as any;
  }

  let rows = (await q) as Record<string, unknown>[];

  if (hasEmbeds(req.columns)) {
    const parsed = parseSelect(req.columns!);
    rows = await hydrateEmbeds(rows, parsed.embeds, ctx);
    rows = applyColumnSelection(rows, parsed.baseColumns, parsed.embeds.map((e) => e.alias));
  } else {
    rows = applyColumnSelection(rows, req.columns);
  }
  rows = redactRows(cfg, rows);

  let count: number | null | undefined;
  if (req.count === "exact") {
    const countRows = await db
      .select({ n: sql<number>`count(*)` })
      .from(cfg.table as any)
      .where(where ?? sql`1=1`);
    count = Number(countRows[0]?.n ?? 0);
  }

  if (req.single || req.maybeSingle) {
    if (rows.length === 0) {
      if (req.maybeSingle) return { data: null, error: null, count };
      return {
        data: null,
        error: { message: "No rows found", code: "PGRST116" },
        count,
      };
    }
    if (rows.length > 1 && req.single) {
      return {
        data: null,
        error: { message: "Multiple rows returned", code: "PGRST116" },
        count,
      };
    }
    return { data: rows[0], error: null, count };
  }

  return { data: rows, error: null, count };
}

function toRows(values: unknown): Record<string, unknown>[] {
  if (Array.isArray(values)) return values as Record<string, unknown>[];
  if (values && typeof values === "object") return [values as Record<string, unknown>];
  return [];
}

async function runInsert(
  req: QueryRequest,
  cfg: TableConfig,
  ctx: TenantContext,
): Promise<QueryResponse> {
  const rows = toRows(req.values).map((r) => {
    assertRowAllowed(cfg, ctx, r);
    return forceTenantOnRow(cfg, ctx, r);
  });
  if (rows.length === 0) {
    throw new QueryError("No values to insert", "no_values");
  }
  for (const r of rows) await assertViaParentAllowed(cfg, ctx, r);
  const inserted = (await db
    .insert(cfg.table as any)
    .values(rows)
    .returning()) as Record<string, unknown>[];
  return returnedResponse(req, inserted, cfg);
}

async function runUpdate(
  req: QueryRequest,
  cfg: TableConfig,
  ctx: TenantContext,
  where: SQL | undefined,
): Promise<QueryResponse> {
  const patch = { ...(req.values as Record<string, unknown>) };
  assertPatchAllowed(cfg, ctx, patch);
  // Never allow re-targeting the tenant column via update.
  if (cfg.tenantColumn && ctx.tenantId && patch[cfg.tenantColumn] != null) {
    patch[cfg.tenantColumn] = ctx.tenantId;
  }
  const updated = (await db
    .update(cfg.table as any)
    .set(patch)
    .where(where ?? sql`1=1`)
    .returning()) as Record<string, unknown>[];
  return returnedResponse(req, updated, cfg);
}

async function runDelete(
  req: QueryRequest,
  cfg: TableConfig,
  where: SQL | undefined,
): Promise<QueryResponse> {
  const deleted = (await db
    .delete(cfg.table as any)
    .where(where ?? sql`1=1`)
    .returning()) as Record<string, unknown>[];
  return returnedResponse(req, deleted, cfg);
}

async function runUpsert(
  req: QueryRequest,
  cfg: TableConfig,
  ctx: TenantContext,
): Promise<QueryResponse> {
  const rows = toRows(req.values).map((r) => {
    assertRowAllowed(cfg, ctx, r);
    return forceTenantOnRow(cfg, ctx, r);
  });
  if (rows.length === 0) {
    throw new QueryError("No values to upsert", "no_values");
  }
  for (const r of rows) await assertViaParentAllowed(cfg, ctx, r);
  const conflictCols = (req.onConflict ?? "id")
    .split(",")
    .map((c) => c.trim())
    .map((c) => getColumn(cfg, c));

  const results: Record<string, unknown>[] = [];
  for (const row of rows) {
    const setCols: Record<string, unknown> = { ...row };
    const res = (await db
      .insert(cfg.table as any)
      .values(row)
      .onConflictDoUpdate({ target: conflictCols, set: setCols })
      .returning()) as Record<string, unknown>[];
    results.push(...res);
  }
  return returnedResponse(req, results, cfg);
}

function returnedResponse(
  req: QueryRequest,
  rows: Record<string, unknown>[],
  cfg: TableConfig,
): QueryResponse {
  if (!req.returning) return { data: null, error: null };
  const projected = redactRows(cfg, applyColumnSelection(rows, req.columns));
  if (req.single || req.maybeSingle) {
    if (projected.length === 0) {
      if (req.maybeSingle) return { data: null, error: null };
      return { data: null, error: { message: "No rows returned", code: "PGRST116" } };
    }
    return { data: projected[0], error: null };
  }
  return { data: projected, error: null };
}
