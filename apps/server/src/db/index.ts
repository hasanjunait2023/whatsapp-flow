import pg from "pg";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { NODE_ENV, getDatabaseUrl } from "../lib/env.js";
import { appSchema } from "./schema.js";
import { authSchema } from "./auth-schema.js";

const schema = { ...appSchema, ...authSchema };

/** Uniform shape returned by both the pg Pool and the PGlite test client. */
export interface RawResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

/**
 * Minimal raw-SQL surface used by db/raw.ts. Abstracts the prod pg Pool and the
 * in-process PGlite test client behind one async interface so the ported raw-SQL
 * call sites work identically in both environments.
 */
export interface RawDb {
  query(text: string, params?: unknown[]): Promise<RawResult>;
  tx<T>(
    fn: (q: (text: string, params?: unknown[]) => Promise<RawResult>) => Promise<T>,
  ): Promise<T>;
}

let db: NodePgDatabase<typeof schema>;
let rawDb: RawDb;

if (NODE_ENV === "test") {
  // PGlite: in-process WASM Postgres. Each test file runs in its own fork
  // (vitest pool:forks, fileParallelism:false), so a fresh ephemeral instance
  // per file preserves the isolation the old temp-file SQLite harness gave.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  db = drizzlePglite(client, { schema }) as unknown as NodePgDatabase<typeof schema>;
  rawDb = {
    async query(text, params = []) {
      const r = await client.query(text, params as unknown[]);
      const rows = (r.rows ?? []) as Record<string, unknown>[];
      return { rows, rowCount: r.affectedRows ?? rows.length };
    },
    async tx(fn) {
      return client.transaction(async (txClient) =>
        fn(async (text, params = []) => {
          const r = await txClient.query(text, params as unknown[]);
          const rows = (r.rows ?? []) as Record<string, unknown>[];
          return { rows, rowCount: r.affectedRows ?? rows.length };
        }),
      );
    },
  };
} else {
  const pool = new pg.Pool({ connectionString: getDatabaseUrl(), max: 10 });
  db = drizzlePg(pool, { schema });
  rawDb = {
    async query(text, params = []) {
      const r = await pool.query(text, params as unknown[]);
      return { rows: r.rows, rowCount: r.rowCount ?? 0 };
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const out = await fn(async (text, params = []) => {
          const r = await client.query(text, params as unknown[]);
          return { rows: r.rows, rowCount: r.rowCount ?? 0 };
        });
        await client.query("COMMIT");
        return out;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}

export { db, rawDb, schema };
export type DB = typeof db;
