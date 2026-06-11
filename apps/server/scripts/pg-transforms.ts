/**
 * Pure, DB-free transforms for the Phase-4 Postgres -> SQLite migration.
 *
 * The `pg` driver returns native JS values for most column types (the script
 * configures node-postgres to hand back jsonb as objects, timestamptz as Date,
 * arrays as JS arrays, etc.). These helpers normalise those native values into
 * the exact SQLite storage shapes the Drizzle schema expects, matching the type
 * map documented at the top of src/db/schema.ts:
 *
 *   uuid                 -> text (verbatim)
 *   timestamptz          -> text (ISO-8601, identical to Date.toISOString())
 *   jsonb / text[]       -> text (JSON.stringify); Drizzle { mode: "json" }
 *                           columns store the serialised form
 *   boolean              -> 0 | 1 integer
 *   numeric / money      -> string (verbatim, preserves precision)
 *   null / undefined     -> null (never coerced to "" / 0)
 *
 * Every function is total and immutable: it returns a new value and never
 * mutates its input. Keeping these here (not in the orchestrator) lets the test
 * suite exercise them without opening a database or a Postgres connection.
 */

/** A value as it arrives from node-postgres for a single column. */
export type PgValue = unknown;

/** True for SQL NULL (pg yields `null`) and absent columns (`undefined`). */
export function isNullish(value: PgValue): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * uuid / text / timestamptz -> text. Postgres uuid and text arrive as strings
 * and pass through verbatim so primary keys and tenant_id values match exactly.
 * timestamptz arrives as a JS Date and is emitted as ISO-8601 (identical to
 * `Date.toISOString()`), so a single `text` kind covers both uuid columns and
 * the timestamp-as-text columns the SQLite schema stores as text.
 */
export function toText(value: PgValue): string | null {
  if (isNullish(value)) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  return String(value);
}

/**
 * timestamptz -> ISO-8601 text. node-postgres returns timestamptz as a JS Date;
 * we emit `Date.toISOString()` so the value is byte-identical to what the app
 * writes (`new Date().toISOString()`). Strings already in ISO form pass through;
 * other parseable strings are normalised to ISO.
 */
export function toIsoText(value: PgValue): string | null {
  if (isNullish(value)) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }
  return null;
}

/**
 * boolean -> 0 | 1 integer. Postgres returns booleans natively; the SQLite
 * schema stores them via Drizzle's { mode: "boolean" } as 0/1 integers.
 * Accepts the common string spellings too in case a column comes back as text.
 */
export function toBoolInt(value: PgValue): 0 | 1 | null {
  if (isNullish(value)) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value === 0 ? 0 : 1;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "t" || v === "true" || v === "1" || v === "yes" || v === "y") return 1;
    if (v === "f" || v === "false" || v === "0" || v === "no" || v === "n") return 0;
  }
  return null;
}

/**
 * jsonb -> JSON text. node-postgres parses jsonb into JS objects/arrays; we
 * serialise back to a string so the value lands in a Drizzle { mode: "json" }
 * column (which itself JSON.parses on read). A value that is already a string
 * is assumed to be serialised JSON and passed through unchanged so we never
 * double-encode.
 */
export function toJsonText(value: PgValue): string | null {
  if (isNullish(value)) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Postgres array (e.g. text[]) -> JSON text. node-postgres returns arrays as JS
 * arrays; the SQLite schema stores them in { mode: "json" } columns, so a JSON
 * array string is the correct shape. A pre-serialised JSON-array string passes
 * through; any other scalar is wrapped into a single-element array so the
 * column always holds valid JSON.
 */
export function toArrayJsonText(value: PgValue): string | null {
  if (isNullish(value)) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("[")) return trimmed;
    return JSON.stringify([value]);
  }
  return JSON.stringify([value]);
}

/**
 * numeric / money -> string. Kept verbatim as text so arbitrary precision is
 * preserved (JS number would lose precision on large/exact decimals).
 * node-postgres already returns numeric as a string by default; numbers are
 * stringified defensively.
 */
export function toNumericText(value: PgValue): string | null {
  if (isNullish(value)) return null;
  if (typeof value === "number") return String(value);
  return String(value);
}

/**
 * numeric/money -> real number, for the handful of price/amount/total columns
 * the SQLite schema stores as `real` (the UI does arithmetic on them). Returns
 * null for nullish input; throws on a non-finite parse so a corrupt source
 * value fails loudly rather than silently becoming 0.
 */
export function toReal(value: PgValue): number | null {
  if (isNullish(value)) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Cannot convert ${JSON.stringify(value)} to a real number`);
  }
  return n;
}

/**
 * integer -> integer. Passes finite integers through; truncates floats; throws
 * on a non-numeric value so bad data is caught rather than nulled.
 */
export function toInt(value: PgValue): number | null {
  if (isNullish(value)) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Cannot convert ${JSON.stringify(value)} to an integer`);
  }
  return Math.trunc(n);
}

// ---------------------------------------------------------------------------
// Column-kind driven row transform
// ---------------------------------------------------------------------------

/**
 * The transform kind for a single column, derived from the Drizzle SQLite
 * column type plus the Postgres source type. The orchestrator builds a
 * per-table map of { columnName: ColumnKind } from the schema and feeds each
 * source row through `transformRow`.
 */
export type ColumnKind =
  | "text" // uuid / text / timestamptz already-as-text passthrough
  | "iso" // timestamptz -> ISO-8601 text
  | "bool" // boolean -> 0/1
  | "json" // jsonb -> JSON text
  | "array" // pg array -> JSON text
  | "numericText" // numeric/money -> string
  | "real" // numeric/money -> real
  | "int"; // integer -> integer

const TRANSFORMERS: Record<ColumnKind, (v: PgValue) => unknown> = {
  text: toText,
  iso: toIsoText,
  bool: toBoolInt,
  json: toJsonText,
  array: toArrayJsonText,
  numericText: toNumericText,
  real: toReal,
  int: toInt,
};

/**
 * Transforms one source row into SQLite-shaped values using a column->kind map.
 *
 * - Only columns present in `kinds` are emitted; unknown source columns are
 *   dropped (the target schema is authoritative).
 * - A column listed in `kinds` but absent from the row is skipped entirely so
 *   the SQLite default/NULL applies rather than forcing an explicit null.
 * - Returns a fresh object; the input row is never mutated.
 */
export function transformRow(
  row: Record<string, PgValue>,
  kinds: Record<string, ColumnKind>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [column, kind] of Object.entries(kinds)) {
    if (!(column in row)) continue;
    out[column] = TRANSFORMERS[kind](row[column]);
  }
  return out;
}
