import { fileURLToPath } from "node:url";
import path from "node:path";
import { NODE_ENV } from "../lib/env.js";
import { db } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "..", "drizzle");

/**
 * Acquire a Postgres advisory lock so concurrent `runMigrations()` invocations
 * can't double-apply. Uses lock id `0x57414844` ("WAHD" — WhatsApp Hono Drizzle).
 */
async function withMigrationLock<T>(fn: () => Promise<T>): Promise<T> {
  if (NODE_ENV === "test") return fn(); // PGlite is in-process, no concurrent runs
  // pg_advisory_lock is session-scoped; we open a dedicated client so the lock
  // lives for the whole migration and is released on the same connection.
  const { Pool } = await import("pg");
  const { getDatabaseUrl } = await import("../lib/env.js");
  const pool = new Pool({ connectionString: getDatabaseUrl() });
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(1464420164)"); // arbitrary 32-bit lock id
    return await fn();
  } finally {
    await client.query("SELECT pg_advisory_unlock(1464420164)");
    client.release();
    await pool.end();
  }
}

/**
 * Applies all generated drizzle migrations to the configured database.
 * Uses the PGlite migrator under test (in-process) and the node-postgres
 * migrator in every other environment.
 *
 * Wrapped in a Postgres advisory lock so concurrent invocations can't race.
 */
export async function runMigrations(): Promise<void> {
  await withMigrationLock(async () => {
    try {
      if (NODE_ENV === "test") {
        const { migrate } = await import("drizzle-orm/pglite/migrator");
        await migrate(db as never, { migrationsFolder });
      } else {
        const { migrate } = await import("drizzle-orm/node-postgres/migrator");
        await migrate(db as never, { migrationsFolder });
      }
    } catch (err) {
      // Wrap so the caller sees context, not the raw drizzle SQL error
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[migrate] migration failed: ${msg}`);
      throw err;
    }
  });
}

// Allow `tsx src/db/migrate.ts` direct invocation.
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  await runMigrations();
}