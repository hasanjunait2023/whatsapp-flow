import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { useTempDb } from "./helpers.js";

// Capture the temp DB path so a second (reader) connection can open the same file.
const DB_PATH = useTempDb();

const { sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { db } = await import("../src/db/index.js");
const { tenants, contacts } = await import("../src/db/schema.js");

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const MSG_COUNT = 2000;

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values({ id: TENANT, name: "Load", owner_id: "u" }).run();
  db.insert(contacts)
    .values({ id: "c1", tenant_id: TENANT, wa_id: "w@s", phone_number: "1", instance_id: "i1" })
    .run();
});

/**
 * Phase-6 write-load / single-writer-contention check. The architecture bets on
 * one better-sqlite3 connection (serialized writer) + WAL readers holding up
 * under the webhook ingest path on a shared box. These tests lock in the PRAGMA
 * config and prove a high-volume transactional insert + a concurrent reader work.
 */
describe("SQLite production PRAGMA config", () => {
  it("applies WAL, busy_timeout, foreign_keys, and synchronous=NORMAL", () => {
    expect(String(sqlite.pragma("journal_mode", { simple: true })).toLowerCase()).toBe("wal");
    expect(Number(sqlite.pragma("busy_timeout", { simple: true }))).toBe(5000);
    expect(Number(sqlite.pragma("foreign_keys", { simple: true }))).toBe(1);
    // synchronous: 0=OFF, 1=NORMAL, 2=FULL — NORMAL is the WAL throughput sweet spot.
    expect(Number(sqlite.pragma("synchronous", { simple: true }))).toBe(1);
  });
});

describe("write throughput (webhook ingest shape)", () => {
  it("inserts a large batch in one transaction with no contention errors", () => {
    const insert = sqlite.prepare(
      `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
       VALUES (?, ?, ?, 'inbound', ?, 'text', ?)`,
    );
    const insertMany = sqlite.transaction((n: number) => {
      for (let i = 0; i < n; i++) {
        insert.run(`m-${i}`, TENANT, "c1", `body ${i}`, `wamid-${i}`);
      }
    });

    const start = performance.now();
    insertMany(MSG_COUNT);
    const elapsedMs = performance.now() - start;

    const count = sqlite
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE tenant_id = ?")
      .get(TENANT) as { n: number };
    expect(count.n).toBe(MSG_COUNT);
    // Generous ceiling — a smoke bound to catch a pathological regression, not a
    // micro-benchmark. NORMAL+WAL inserts thousands/sec even on slow disks.
    expect(elapsedMs).toBeLessThan(5000);
  });

  it("upholds the messages(wa_message_id) UNIQUE dedup guarantee under load", () => {
    const dup = sqlite.prepare(
      `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
       VALUES (?, ?, 'c1', 'inbound', 'x', 'text', 'wamid-0')`,
    );
    // wamid-0 already exists from the batch above.
    expect(() => dup.run("dup-id", TENANT)).toThrow(/UNIQUE/i);
  });
});

describe("WAL concurrent reader (no SQLITE_BUSY)", () => {
  it("a separate read connection sees committed rows while the writer holds the main connection", () => {
    const reader = new Database(DB_PATH, { readonly: true });
    reader.pragma("busy_timeout = 5000");
    try {
      const before = reader.prepare("SELECT COUNT(*) AS n FROM messages").get() as { n: number };

      // Writer commits more rows on the main connection.
      const insert = sqlite.prepare(
        `INSERT INTO messages (id, tenant_id, contact_id, direction, content, content_type, wa_message_id)
         VALUES (?, ?, 'c1', 'inbound', 'y', 'text', ?)`,
      );
      const tx = sqlite.transaction(() => {
        for (let i = 0; i < 50; i++) insert.run(`r-${i}`, TENANT, `wamid-r-${i}`);
      });
      tx();

      // Reader (WAL) can read concurrently and sees the committed delta — no busy error.
      const after = reader.prepare("SELECT COUNT(*) AS n FROM messages").get() as { n: number };
      expect(after.n).toBe(before.n + 50);
    } finally {
      reader.close();
    }
  });
});
