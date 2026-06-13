import pg from "pg";
import { rawDb, type RawResult } from "../../db/index.js";

/**
 * RAG query surface. Uses a dedicated pgvector database (RAG_DATABASE_URL) when
 * set — keeps vectors off the shared app/postiz Postgres, which has no pgvector
 * and is RAM-constrained. Falls back to the app DB (rawDb) when unset, so tests
 * (PGlite) and single-DB deployments still work unchanged.
 */

let pool: pg.Pool | null = null;
let resolved = false;

function ragPool(): pg.Pool | null {
  if (!resolved) {
    resolved = true;
    const url = process.env.RAG_DATABASE_URL;
    pool = url ? new pg.Pool({ connectionString: url, max: 5 }) : null;
  }
  return pool;
}

/** True when a dedicated RAG database is configured. */
export function hasDedicatedRagDb(): boolean {
  return Boolean(process.env.RAG_DATABASE_URL);
}

export async function ragQuery(text: string, params: unknown[] = []): Promise<RawResult> {
  const p = ragPool();
  if (!p) return rawDb.query(text, params);
  const r = await p.query(text, params as unknown[]);
  return { rows: r.rows, rowCount: r.rowCount ?? 0 };
}
