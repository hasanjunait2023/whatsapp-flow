// Standalone partitioning APPLY script.
//
// IMPORTANT: this is destructive. Plan carefully:
//   1. Pause app writers (docker compose stop app)
//   2. Take a Postgres backup first (see /root/brain/notes/whatsapp-flow-state-2026-07-01.md)
//   3. Run `node scripts/partitioning/dry-run.ts` to confirm it should run
//   4. Run `node scripts/partitioning/apply.ts`
//   5. Verify row count + indexes
//   6. docker compose start app
//
// What it does (mirrors /root/brain/notes/whatsapp-flow-partitioning-prep.sql):
//   - Adds created_at_ts TIMESTAMPTZ GENERATED column on messages
//   - Adds B-tree on (tenant_id, created_at_ts)
//   - RENAME messages -> messages_unpart; CREATE partitioned messages; INSERT back
//   - Pre-creates partitions for 3 months back + 6 months forward + DEFAULT

import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(2); }

const client = new pg.Client({ connectionString: dbUrl });
await client.connect();

console.log("Step 1: add created_at_ts GENERATED column + index");
await client.query("BEGIN");
try {
  await client.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at_ts TIMESTAMPTZ GENERATED ALWAYS AS (created_at::timestamptz) STORED");
  await client.query("CREATE INDEX IF NOT EXISTS messages_tenant_id_created_at_ts_idx ON messages (tenant_id, created_at_ts)");

  console.log("Step 2: rename + create partitioned table");
  await client.query("ALTER TABLE messages RENAME TO messages_unpart");
  await client.query("CREATE TABLE messages (LIKE messages_unpart INCLUDING ALL) PARTITION BY RANGE (created_at_ts)");

  console.log("Step 3: pre-create partitions");
  // 3 months back + 6 months forward + a DEFAULT catch-all
  // (Boss should tune the bounds for real traffic; this is a starter scaffold.)
  const partitions = [
    "FOR VALUES FROM (\'2026-04-01\') TO (\'2026-07-01\')",
    "FOR VALUES FROM (\'2026-07-01\') TO (\'2026-10-01\')",
    "FOR VALUES FROM (\'2026-10-01\') TO (\'2027-01-01\')",
    "FOR VALUES FROM (\'2027-01-01\') TO (\'2027-04-01\')",
    "DEFAULT"
  ];
  for (const bound of partitions) {
    const name = bound === "DEFAULT" ? "messages_default" : `messages_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    await client.query(`CREATE TABLE ${name} PARTITION OF messages ${bound}`);
    if (bound !== "DEFAULT") {
      await client.query(`ALTER TABLE ${name} ADD CONSTRAINT ${name}_pkey PRIMARY KEY (id)`);
      await client.query(`CREATE INDEX ${name}_tenant_ts_idx ON ${name} (tenant_id, created_at_ts)`);
    }
  }

  console.log("Step 4: copy data");
  await client.query("INSERT INTO messages SELECT * FROM messages_unpart");

  console.log("Step 5: drop unpartitioned");
  await client.query("DROP TABLE messages_unpart");

  await client.query("COMMIT");
  console.log("\n✅ DONE. Verify with `SELECT count(*) FROM messages;`");
} catch (e: unknown) {
  await client.query("ROLLBACK");
  console.error("rolled back:", e instanceof Error ? e.message : String(e));
  process.exit(1);
} finally {
  await client.end();
}
