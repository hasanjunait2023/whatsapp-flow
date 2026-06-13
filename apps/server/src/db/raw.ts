import { rawDb } from "./index.js";

/**
 * Raw-SQL helpers — the Postgres replacement for the old `better-sqlite3`
 * prepared-statement API. The ported call sites keep their `?` placeholders;
 * we rewrite them to Postgres `$1,$2,...` here so the SQL bodies barely change.
 *
 * Mapping from the old synchronous API:
 *   sqlite.prepare(sql).get(...p)  -> await dbGet(sql, ...p)
 *   sqlite.prepare(sql).all(...p)  -> await dbAll(sql, ...p)
 *   sqlite.prepare(sql).run(...p)  -> await dbRun(sql, ...p)   // { changes }
 *   sqlite.transaction((a)=>{...}) -> await dbTx(async (tx)=>{...})  // tx.get/all/run
 *
 * NOTE: `?` rewriting is positional and does not parse string literals; the
 * ported SQL uses `?` only as value placeholders, never as a literal char.
 */
function toPg(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/**
 * Normalizes a jsonb column value. Postgres returns jsonb ALREADY PARSED (an
 * object/array), whereas the old better-sqlite3 (text+JSON) returned a string
 * that call sites JSON.parse()'d. This accepts either and returns the parsed
 * value, so ported `JSON.parse(row.col)` sites become `coerceJson(row.col)`.
 */
export function coerceJson<T = unknown>(v: unknown): T {
  return (typeof v === "string" ? JSON.parse(v) : v) as T;
}

export async function dbGet<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T | undefined> {
  const r = await rawDb.query(toPg(sql), params);
  return r.rows[0] as T | undefined;
}

export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const r = await rawDb.query(toPg(sql), params);
  return r.rows as T[];
}

export async function dbRun(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
  const r = await rawDb.query(toPg(sql), params);
  return { changes: r.rowCount };
}

/** Per-transaction query surface handed to the dbTx callback. */
export interface TxQuery {
  get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): Promise<T[]>;
  run(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}

/** Runs `fn` inside a single transaction (BEGIN/COMMIT, ROLLBACK on throw). */
export async function dbTx<T>(fn: (tx: TxQuery) => Promise<T>): Promise<T> {
  return rawDb.tx(async (q) => {
    const tx: TxQuery = {
      async get(sql, ...params) {
        return (await q(toPg(sql), params)).rows[0] as never;
      },
      async all(sql, ...params) {
        return (await q(toPg(sql), params)).rows as never;
      },
      async run(sql, ...params) {
        return { changes: (await q(toPg(sql), params)).rowCount };
      },
    };
    return fn(tx);
  });
}
