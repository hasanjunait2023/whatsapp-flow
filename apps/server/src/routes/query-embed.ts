import { and, eq, inArray, getTableColumns, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { QUERY_TABLES, type TableConfig } from "./query-tables.js";
import type { TenantContext } from "../middleware/tenant.ts";

/**
 * Minimal PostgREST-style embedded-select support.
 *
 * Parses a select string like:
 *   "id, tenant_id, role, tenant:tenants ( id, name, slug )"
 * into a base column list plus embedded relation descriptors, then hydrates the
 * relations for the returned rows. Only allowlisted target tables are resolved;
 * unknown embeds are ignored (their alias is set to null) so non-core modules
 * fail soft until their tables are allowlisted in later phases.
 *
 * Foreign key is inferred by convention: `<alias>_id` or `<relation>_id` on the
 * base row joined to the target's `id`.
 */

export interface EmbedSpec {
  alias: string;
  table: string;
  columns: string; // inner column list
  /** column on the base row holding the FK (defaults to `<table-singular>_id`). */
  fkColumn: string;
}

export interface ParsedSelect {
  baseColumns: string;
  embeds: EmbedSpec[];
}

export function parseSelect(columns: string): ParsedSelect {
  const embeds: EmbedSpec[] = [];
  const baseParts: string[] = [];

  let i = 0;
  let token = "";
  const flushToken = () => {
    const t = token.trim();
    if (t) baseParts.push(t);
    token = "";
  };

  while (i < columns.length) {
    const ch = columns[i];
    if (ch === "(") {
      // token currently holds "alias:table" (or "table")
      let depth = 1;
      let inner = "";
      i++;
      while (i < columns.length && depth > 0) {
        const c = columns[i];
        if (c === "(") depth++;
        else if (c === ")") depth--;
        if (depth > 0) inner += c;
        i++;
      }
      const head = token.trim();
      token = "";
      const [aliasOrTable, maybeTable] = head.split(":").map((s) => s.trim().replace(/!.*$/, ""));
      const alias = maybeTable ? aliasOrTable : aliasOrTable;
      const table = maybeTable ?? aliasOrTable;
      const fkColumn = `${alias}_id`;
      embeds.push({ alias, table, columns: inner.trim(), fkColumn });
      // skip a trailing comma
      while (i < columns.length && (columns[i] === "," || columns[i] === " ")) i++;
      continue;
    }
    if (ch === ",") {
      flushToken();
      i++;
      continue;
    }
    token += ch;
    i++;
  }
  flushToken();

  return { baseColumns: baseParts.join(", ") || "*", embeds };
}

export function hasEmbeds(columns?: string): boolean {
  return !!columns && columns.includes("(");
}

/**
 * SECURITY: an embedded relation is resolved by FK id, which would otherwise
 * cross tenant boundaries and bypass per-table redaction. We apply the SAME
 * isolation rules the base-table path uses (tenantScope) to the embed target,
 * and strip its secret columns. Returns the extra WHERE conditions, or "deny"
 * when the caller has no tenant on a tenant-scoped target (embed yields null).
 */
function embedScope(
  cfg: TableConfig,
  ctx: TenantContext,
  cols: Record<string, any>,
): SQL[] | "deny" {
  if (ctx.isAdmin) return [];
  if (cfg.tenantColumn) {
    if (!ctx.tenantId) return "deny";
    return [eq(cols[cfg.tenantColumn], ctx.tenantId)];
  }
  if (cfg.tenantViaParent) {
    if (!ctx.tenantId) return "deny";
    const parentCfg = QUERY_TABLES[cfg.tenantViaParent.parentTable];
    const parentCols = getTableColumns(parentCfg.table) as Record<string, any>;
    return [
      inArray(
        cols[cfg.tenantViaParent.fkColumn],
        db
          .select({ id: parentCols.id })
          .from(parentCfg.table as any)
          .where(eq(parentCols.tenant_id, ctx.tenantId)),
      ),
    ];
  }
  switch (cfg.access) {
    case "own-profile":
      return [eq(cols.id, ctx.userId)];
    case "own-tenant":
      return ctx.tenantId ? [eq(cols.id, ctx.tenantId)] : "deny";
    case "membership":
      return [eq(cols.user_id, ctx.userId)];
    default:
      // Global reference tables (plans, business_types, ...) — safe to embed.
      return [];
  }
}

function redactEmbed(
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

export async function hydrateEmbeds(
  rows: Record<string, unknown>[],
  embeds: EmbedSpec[],
  ctx: TenantContext,
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0 || embeds.length === 0) return rows;
  const result = rows.map((r) => ({ ...r }));

  for (const embed of embeds) {
    const cfg = QUERY_TABLES[embed.table];
    if (!cfg) {
      for (const row of result) row[embed.alias] = null;
      continue;
    }
    const cols = getTableColumns(cfg.table) as Record<string, any>;
    const scope = embedScope(cfg, ctx, cols);
    if (scope === "deny") {
      for (const row of result) row[embed.alias] = null;
      continue;
    }
    const fkValues = Array.from(
      new Set(
        result
          .map((r) => r[embed.fkColumn])
          .filter((v): v is string => typeof v === "string"),
      ),
    );
    if (fkValues.length === 0) {
      for (const row of result) row[embed.alias] = null;
      continue;
    }
    const idCond =
      fkValues.length === 1 ? eq(cols.id, fkValues[0]) : inArray(cols.id, fkValues);
    const where = scope.length > 0 ? and(idCond, ...scope) : idCond;
    const related = redactEmbed(
      cfg,
      (await db.select().from(cfg.table as any).where(where)) as Record<string, unknown>[],
    );

    const byId = new Map(related.map((r) => [r.id as string, r]));
    for (const row of result) {
      const fk = row[embed.fkColumn];
      row[embed.alias] = typeof fk === "string" ? byId.get(fk) ?? null : null;
    }
  }
  return result;
}
