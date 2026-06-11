import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { DB_PATH } from "../lib/env.js";
import { appSchema } from "./schema.js";
import { authSchema } from "./auth-schema.js";

const schema = { ...appSchema, ...authSchema };

function ensureDbDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

ensureDbDir(DB_PATH);

/** Single shared connection — one serialized writer (WAL allows concurrent readers). */
export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("busy_timeout = 5000");
sqlite.pragma("foreign_keys = ON");
// NORMAL is the standard durability mode under WAL: a fsync only at checkpoint,
// not per-commit — large write-throughput win for the webhook ingest path. Safe
// here because the WAL is continuously replicated off-box by Litestream, so the
// only NORMAL risk (losing the last txn on an OS-level crash) is itself backed up.
sqlite.pragma("synchronous = NORMAL");

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
export { schema };
