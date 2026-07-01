// standalone partitioning dry-run script.
// Runs the same guard check the migration would run, prints actionable output.
//
// Usage (from /apps/server):
//   $ node --import tsx scripts/partitioning/dry-run.ts
//
// Reads DATABASE_URL from .env or process.env. Prints "ready" or "below threshold".

import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(2);
}

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

try {
  const r = await client.query(`
    SELECT
      (SELECT count(*) FROM messages) AS msgs,
      (SELECT count(distinct tenant_id) FROM messages) AS tenants,
      (SELECT pg_total_relation_size('messages')) AS size_bytes
  `);
  const { msgs, tenants, size_bytes } = r.rows[0];
  const sizeMb = (size_bytes / 1024 / 1024).toFixed(2);

  console.log(`messages table state:`);
  console.log(`  rows:    ${msgs}`);
  console.log(`  tenants: ${tenants}`);
  console.log(`  size:    ${sizeMb} MB`);

  const ROW_THRESHOLD = 1_000_000;
  const TENANT_THRESHOLD = 100;

  if (msgs < ROW_THRESHOLD && tenants < TENANT_THRESHOLD) {
    console.log(`\nBelow thresholds (need ${ROW_THRESHOLD} rows or ${TENANT_THRESHOLD} tenants).`);
    console.log(`Decision: DEFER partitioning. Use compose-managed schema as-is.`);
    process.exit(0);
  }

  console.log(`\n*** THRESHOLD BREACH — partitioning recommended ***`);
  console.log(`To proceed during the next maintenance window, run:`);
  console.log(`  $ node scripts/partitioning/apply.ts`);
  process.exit(1);
} finally {
  await client.end();
}
