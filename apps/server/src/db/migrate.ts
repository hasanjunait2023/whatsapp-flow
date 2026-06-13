import { fileURLToPath } from "node:url";
import path from "node:path";
import { NODE_ENV } from "../lib/env.js";
import { db } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "..", "drizzle");

/**
 * Applies all generated drizzle migrations to the configured database.
 * Uses the PGlite migrator under test (in-process) and the node-postgres
 * migrator in every other environment.
 */
export async function runMigrations(): Promise<void> {
  if (NODE_ENV === "test") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db as never, { migrationsFolder });
  }
}

// Allow `tsx src/db/migrate.ts` direct invocation.
if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  await runMigrations();
}
