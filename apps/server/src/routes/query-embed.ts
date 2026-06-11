import { eq, inArray, getTableColumns } from "drizzle-orm";
import { db } from "../db/index.js";
import { QUERY_TABLES } from "./query-tables.js";

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
      const [aliasOrTable, maybeTable] = head.split(":").map((s) => s.trim());
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

export async function hydrateEmbeds(
  rows: Record<string, unknown>[],
  embeds: EmbedSpec[],
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0 || embeds.length === 0) return rows;
  const result = rows.map((r) => ({ ...r }));

  for (const embed of embeds) {
    const cfg = QUERY_TABLES[embed.table];
    if (!cfg) {
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
    const cols = getTableColumns(cfg.table) as Record<string, any>;
    const related = (await db
      .select()
      .from(cfg.table as any)
      .where(
        fkValues.length === 1
          ? eq(cols.id, fkValues[0])
          : inArray(cols.id, fkValues),
      )) as Record<string, unknown>[];

    const byId = new Map(related.map((r) => [r.id as string, r]));
    for (const row of result) {
      const fk = row[embed.fkColumn];
      row[embed.alias] = typeof fk === "string" ? byId.get(fk) ?? null : null;
    }
  }
  return result;
}
