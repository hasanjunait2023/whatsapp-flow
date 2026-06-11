import { fileURLToPath } from "node:url";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "..", "drizzle");

/** Applies all generated drizzle migrations to the configured database. */
export function runMigrations(): void {
  migrate(db, { migrationsFolder });
}

// Allow `tsx src/db/migrate.ts` direct invocation.
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  runMigrations();
}
