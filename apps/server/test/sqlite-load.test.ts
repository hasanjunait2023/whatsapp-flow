import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet, dbRun, dbTx } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, contacts } = await import("../src/db/schema.js");

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const MSG_COUNT = 2000;

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values({ id: TENANT, name: "Load", owner_id: "u" });
  await db
    .insert(contacts)
    .values({ id: "c1", tenant_id: TENANT, wa_id: "w@s", phone_number: "1", instance_id: "i1" });
});

/**
 * Phase-6 write-load / write-contention check, ported to Postgres (PGlite).
 * The architecture bets on the storage layer holding up under the webhook
 * ingest path: a high-volume transactional insert, the wa_message_id UNIQUE
 * dedup guarantee, and concurrent writes all completing without errors.
 *
 * NOTE (pg port): the original sqlite-specific bits — the WAL/busy_timeout/
 * synchronous PRAGMA assertions and the second readonly better-sqlite3 file
 * connection — have no PGlite analogue (PGlite is a single in-process WASM
 * instance, not a shared file with WAL). They are replaced below with the
 * equivalent pg behavior: a storage-health/connectivity check and a concurrent-
 * writes test driven through the async helpers.
 */
describe("Postgres storage is reachable for the ingest path", () => {
  it("connects and exposes the messages table the webhook path writes to", async () => {
    const ok = (await dbGet("SELECT COUNT(*)::int AS n FROM messages")) as { n: number };
    expect(ok.n).toBe(0);
  });
});

describe("write throughput (webhook ingest shape)", () => {
  it("inserts a large batch in one transaction with no contention errors", async () => {
    const start = performance.now();
    await dbTx(async (tx) => {
      for (let i = 0; i < MSG_COUNT; i++) {
        await tx.run(
          `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
           VALUES (?, ?, ?, 'inbound', ?, 'text', ?)`,
          `m-${i}`,
          TENANT,
          "c1",
          `body ${i}`,
          `wamid-${i}`,
        );
      }
    });
    const elapsedMs = performance.now() - start;

    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM messages WHERE tenant_id = ?",
      TENANT,
    )) as { n: number };
    expect(count.n).toBe(MSG_COUNT);
    // Generous ceiling — a smoke bound to catch a pathological regression, not a
    // micro-benchmark. PGlite still inserts thousands/sec.
    expect(elapsedMs).toBeLessThan(15000);
  });

  it("upholds the messages(wa_message_id) UNIQUE dedup guarantee under load", async () => {
    // wamid-0 already exists from the batch above.
    await expect(
      dbRun(
        `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
         VALUES (?, ?, 'c1', 'inbound', 'x', 'text', 'wamid-0')`,
        "dup-id",
        TENANT,
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });
});

describe("concurrent writers (no lost rows, no errors)", () => {
  it("commits all rows when many inserts run concurrently", async () => {
    const before = (await dbGet("SELECT COUNT(*)::int AS n FROM messages")) as { n: number };

    // Fire 50 independent inserts concurrently — the pg pool / PGlite must
    // serialize them safely and lose none.
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        dbRun(
          `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
           VALUES (?, ?, 'c1', 'inbound', 'y', 'text', ?)`,
          `r-${i}`,
          TENANT,
          `wamid-r-${i}`,
        ),
      ),
    );

    const after = (await dbGet("SELECT COUNT(*)::int AS n FROM messages")) as { n: number };
    expect(after.n).toBe(before.n + 50);
  });
});
