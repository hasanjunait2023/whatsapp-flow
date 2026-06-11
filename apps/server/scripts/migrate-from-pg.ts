/**
 * Phase-4 data migration: Supabase Postgres -> local SQLite.
 *
 * Streams every source table (auth first, then app tables in dependency order),
 * transforms each row to the SQLite shape, and upserts via Drizzle inside a
 * per-table transaction. Re-runnable: every insert is ON CONFLICT DO UPDATE on
 * the primary key, so a second run reconciles rather than duplicates.
 *
 * Runs ONLY when a Postgres connection string is provided. With no creds it
 * prints how to supply one and exits non-zero — it never hardcodes or logs a
 * connection string, bcrypt hash, or token.
 *
 *   DATABASE_URL=postgres://... pnpm --filter server exec tsx scripts/migrate-from-pg.ts
 *
 * `pg` is a devDependency, dynamic-imported here so the server build/runtime
 * never depends on it. Media download is guarded behind --download-media and
 * requires creds; the URL-rewrite of media columns happens regardless.
 */

import { sql, getTableColumns } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db, sqlite } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";
import { appSchema } from "../src/db/schema.js";
import { user as userTable, account as accountTable } from "../src/db/auth-schema.js";
import { transformRow, type ColumnKind } from "./pg-transforms.js";
import { MIGRATION_TABLES, MEDIA_URL_COLUMNS, kindsForTable } from "./pg-tables.js";
import { mapGoTrueUser, type GoTrueUser, type GoTrueIdentity } from "./pg-auth-map.js";
import { rewriteMediaUrl } from "./pg-media.js";
import { downloadMedia, type MediaDownloader } from "./pg-media-download.js";

// --- Minimal pg client surface (avoids a hard type dep on @types/pg) ---------
interface PgQueryResult {
  rows: Array<Record<string, unknown>>;
  rowCount: number | null;
}
interface PgClient {
  connect(): Promise<void>;
  query(text: string, params?: unknown[]): Promise<PgQueryResult>;
  end(): Promise<void>;
}

const BATCH_SIZE = 500;

function readConnectionString(): string | null {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? null;
}

/** Connects a pg client via dynamic import so the build never needs `pg`. */
async function connectPg(connectionString: string): Promise<PgClient> {
  // Specifier built at runtime so tsc/the bundler never tries to resolve `pg`
  // (it is a devDependency present only when the migration is actually run).
  const specifier = ["p", "g"].join("");
  let pgModule: { Client: new (config: { connectionString: string }) => PgClient };
  try {
    pgModule = (await import(specifier)) as unknown as typeof pgModule;
  } catch {
    throw new Error(
      "The 'pg' package is not installed. Run `pnpm --filter server install` " +
        "(pg is a devDependency) before running the migration.",
    );
  }
  const client = new pgModule.Client({ connectionString });
  await client.connect();
  return client;
}

/** Per-table outcome for the validation report. */
interface TableReport {
  table: string;
  source: number;
  inserted: number;
  skipped: number;
  mediaRewrites: number;
}

/** Quotes a Postgres identifier for safe interpolation into a query. */
function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Upserts already-transformed rows into a target SQLite table inside one
 * transaction, conflict-resolving on the primary key. Drizzle's
 * onConflictDoUpdate needs the conflict target + set map; we derive both from
 * the table's columns so this is generic across all tables.
 */
function upsertRows(
  target: keyof typeof appSchema,
  rows: Array<Record<string, unknown>>,
): number {
  if (rows.length === 0) return 0;
  const table = appSchema[target];
  const columns = getTableColumns(table) as Record<string, SQLiteColumn>;

  const pkColumns = Object.values(columns).filter((c) => c.primary);
  const pkNames = new Set(pkColumns.map((c) => c.name));

  // SET map for every non-PK column so a re-run reconciles changed values.
  const setEntries: Record<string, unknown> = {};
  for (const col of Object.values(columns)) {
    if (pkNames.has(col.name)) continue;
    setEntries[col.name] = sql.raw(`excluded.${ident(col.name)}`);
  }

  const tx = sqlite.transaction(() => {
    const insert = db.insert(table).values(rows as never);
    if (pkColumns.length === 0 || Object.keys(setEntries).length === 0) {
      insert.onConflictDoNothing().run();
    } else {
      insert
        .onConflictDoUpdate({ target: pkColumns as never, set: setEntries as never })
        .run();
    }
  });
  tx();
  return rows.length;
}

/**
 * Migrates GoTrue auth (auth.users + auth.identities) into better-auth
 * user/account. Runs first so every tenant/profile/role user reference
 * resolves. Returns the count flagged for forced password reset.
 */
async function migrateAuth(client: PgClient): Promise<{ users: number; resets: number }> {
  const usersRes = await client.query(
    `SELECT id, email, encrypted_password, email_confirmed_at,
            raw_user_meta_data, created_at, updated_at
       FROM auth.users`,
  );
  const identitiesRes = await client.query(
    `SELECT id, user_id, provider,
            COALESCE(identity_data->>'sub', provider_id, id::text) AS provider_id,
            created_at, updated_at
       FROM auth.identities`,
  );

  const identitiesByUser = new Map<string, GoTrueIdentity[]>();
  for (const raw of identitiesRes.rows) {
    const identity = raw as unknown as GoTrueIdentity;
    const list = identitiesByUser.get(identity.user_id) ?? [];
    list.push(identity);
    identitiesByUser.set(identity.user_id, list);
  }

  let resets = 0;
  const tx = sqlite.transaction(() => {
    for (const raw of usersRes.rows) {
      const source = raw as unknown as GoTrueUser;
      const mapped = mapGoTrueUser(
        source,
        identitiesByUser.get(source.id) ?? [],
        () => crypto.randomUUID(),
      );
      if (mapped.needsPasswordReset) resets += 1;

      db.insert(userTable)
        .values(mapped.user)
        .onConflictDoUpdate({
          target: userTable.id,
          set: {
            name: mapped.user.name,
            email: mapped.user.email,
            emailVerified: mapped.user.emailVerified,
            image: mapped.user.image,
            updatedAt: mapped.user.updatedAt,
          },
        })
        .run();

      const accounts = [
        ...(mapped.credentialAccount ? [mapped.credentialAccount] : []),
        ...mapped.oauthAccounts,
      ];
      for (const acct of accounts) {
        db.insert(accountTable).values(acct).onConflictDoNothing().run();
      }
    }
  });
  tx();
  return { users: usersRes.rows.length, resets };
}

/** Streams + migrates one app table, returning its report. */
async function migrateTable(
  client: PgClient,
  source: string,
  target: keyof typeof appSchema,
  downloader: MediaDownloader | null,
): Promise<TableReport> {
  const kinds: Record<string, ColumnKind> = kindsForTable(target);
  const mediaCols = Object.keys(kinds).filter((c) => MEDIA_URL_COLUMNS.has(c));

  const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM ${ident(source)}`);
  const sourceCount = (countRes.rows[0]?.n as number) ?? 0;

  let inserted = 0;
  let mediaRewrites = 0;
  let offset = 0;

  while (offset < sourceCount) {
    const page = await client.query(
      `SELECT * FROM ${ident(source)} ORDER BY 1 LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    );
    if (page.rows.length === 0) break;

    const transformed: Array<Record<string, unknown>> = [];
    for (const row of page.rows) {
      const out = transformRow(row, kinds);
      const tenantId = typeof out.tenant_id === "string" ? out.tenant_id : "";
      for (const col of mediaCols) {
        const current = out[col];
        if (typeof current === "string" && tenantId) {
          const rewritten = rewriteMediaUrl(current, tenantId);
          if (rewritten !== current) {
            mediaRewrites += 1;
            if (downloader) await downloader(current, tenantId);
            out[col] = rewritten;
          }
        }
      }
      transformed.push(out);
    }

    inserted += upsertRows(target, transformed);
    offset += page.rows.length;
  }

  return {
    table: source,
    source: sourceCount,
    inserted,
    skipped: sourceCount - inserted,
    mediaRewrites,
  };
}

function printUsageAndExit(): never {
  process.stderr.write(
    "Postgres connection string not found.\n\n" +
      "Provide one of these environment variables (never commit it):\n" +
      "  DATABASE_URL      e.g. postgres://USER:PASS@HOST:5432/postgres\n" +
      "  SUPABASE_DB_URL   the Supabase project's direct connection string\n\n" +
      "Then run:\n" +
      "  DATABASE_URL=... pnpm --filter server exec tsx scripts/migrate-from-pg.ts\n" +
      "Optional flags:\n" +
      "  --download-media   also download storage objects into MEDIA_DIR\n",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const connectionString = readConnectionString();
  if (!connectionString) printUsageAndExit();

  const wantMedia = process.argv.includes("--download-media");

  // Target schema must exist before we insert.
  runMigrations();

  const client = await connectPg(connectionString);
  const downloader: MediaDownloader | null = wantMedia ? downloadMedia : null;

  const reports: TableReport[] = [];
  try {
    const auth = await migrateAuth(client);
    process.stdout.write(
      `auth.users -> user/account: ${auth.users} users, ${auth.resets} flagged for password reset\n`,
    );

    for (const { source, target } of MIGRATION_TABLES) {
      const report = await migrateTable(client, source, target, downloader);
      reports.push(report);
      process.stdout.write(
        `${report.table.padEnd(34)} src=${report.source} inserted=${report.inserted}` +
          (report.mediaRewrites ? ` media=${report.mediaRewrites}` : "") +
          "\n",
      );
    }
  } finally {
    await client.end();
  }

  printReport(reports);
}

/** Emits the validation report: per-table parity, a total, and FK spot-checks. */
function printReport(reports: TableReport[]): void {
  const mismatches = reports.filter((r) => r.source !== r.inserted);
  const totalSrc = reports.reduce((a, r) => a + r.source, 0);
  const totalIns = reports.reduce((a, r) => a + r.inserted, 0);

  process.stdout.write("\n=== Migration report ===\n");
  process.stdout.write(`tables: ${reports.length}  rows: ${totalIns}/${totalSrc} inserted\n`);

  if (mismatches.length > 0) {
    process.stdout.write("row-count mismatches (source != inserted):\n");
    for (const m of mismatches) {
      process.stdout.write(`  ${m.table}: src=${m.source} inserted=${m.inserted}\n`);
    }
  } else {
    process.stdout.write("row counts match for every table.\n");
  }

  // FK-integrity spot check: every tenant.owner_id resolves to a user.
  const orphanOwners = sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM tenants t
        WHERE t.owner_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM user u WHERE u.id = t.owner_id)`,
    )
    .get() as { n: number };
  process.stdout.write(
    orphanOwners.n === 0
      ? "FK check: all tenants.owner_id resolve to a user.\n"
      : `FK check: ${orphanOwners.n} tenants have an owner_id with no matching user.\n`,
  );

  // FK-integrity spot check: every credential account references a real user.
  const orphanAccounts = sqlite
    .prepare(
      `SELECT COUNT(*) AS n FROM account a
        WHERE NOT EXISTS (SELECT 1 FROM user u WHERE u.id = a.user_id)`,
    )
    .get() as { n: number };
  process.stdout.write(
    orphanAccounts.n === 0
      ? "FK check: all account.user_id resolve to a user.\n"
      : `FK check: ${orphanAccounts.n} account rows reference a missing user.\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    // Never echo the connection string or any secret; report only the message.
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Migration failed: ${message}\n`);
    process.exit(1);
  });
