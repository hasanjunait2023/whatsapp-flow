import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { groupQueueBatch } = await import("../src/routes/groups-fns.js");
const { processGroupAddQueue } = await import("../src/services/groups/queue-processor.js");
const waha = await import("../src/waha/client.js");

const TA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ctx = (tenantId: string) => ({ userId: "u", tenantId, isAdmin: false }) as any;

beforeAll(() => {
  runMigrations();
  for (const t of [TA, TB]) {
    sqlite.prepare("INSERT INTO tenants (id, name, owner_id) VALUES (?, ?, 'o')").run(t, t);
  }
  sqlite
    .prepare("INSERT INTO whatsapp_groups (id, tenant_id, instance_id, name, wa_group_id) VALUES ('g-a', ?, 'inst-a', 'Group A', '123@g.us')")
    .run(TA);
});

beforeEach(() => {
  sqlite.prepare("DELETE FROM group_add_queue").run();
  sqlite.prepare("DELETE FROM tenant_daily_group_limits").run();
  sqlite.prepare("DELETE FROM whatsapp_group_participants").run();
  vi.restoreAllMocks();
});

describe("bulk group-add enqueue", () => {
  it("rejects a group the tenant does not own", async () => {
    const res = await groupQueueBatch({ group_id: "g-a", phone_numbers: ["111"] }, ctx(TB));
    expect((res.data as { success: boolean; error?: string }).error).toMatch(/not found|forbidden/i);
  });

  it("records a queue row for an owned group", async () => {
    const res = await groupQueueBatch(
      { group_id: "g-a", phone_numbers: ["1", "2", "3"], batch_size: 2, interval_minutes: 10 },
      ctx(TA),
    );
    const data = res.data as { success: boolean; queue_id: string; total: number };
    expect(data.success).toBe(true);
    expect(data.total).toBe(3);
    const row = sqlite.prepare("SELECT status, batch_size FROM group_add_queue WHERE id = ?").get(data.queue_id) as {
      status: string;
      batch_size: number;
    };
    expect(row.status).toBe("pending");
    expect(row.batch_size).toBe(2);
  });
});

describe("bulk group-add worker (paced + daily-capped)", () => {
  it("processes one batch, records participants, and bumps the daily quota", async () => {
    const spy = vi.spyOn(waha.wahaClient, "addGroupParticipants").mockResolvedValue({} as any);
    await groupQueueBatch(
      { group_id: "g-a", phone_numbers: ["1", "2", "3", "4", "5"], batch_size: 2, interval_minutes: 10 },
      ctx(TA),
    );
    await processGroupAddQueue(TA);

    expect(spy).toHaveBeenCalledTimes(1); // exactly one batch this run
    const q = sqlite.prepare("SELECT processed_count, status FROM group_add_queue").get() as {
      processed_count: number;
      status: string;
    };
    expect(q.processed_count).toBe(2);
    expect(q.status).toBe("processing");
    const added = sqlite.prepare("SELECT COUNT(*) AS n FROM whatsapp_group_participants").get() as { n: number };
    expect(added.n).toBe(2);
    const quota = sqlite.prepare("SELECT members_added FROM tenant_daily_group_limits WHERE tenant_id = ?").get(TA) as {
      members_added: number;
    };
    expect(quota.members_added).toBe(2);
  });

  it("stops at the per-tenant daily limit", async () => {
    vi.spyOn(waha.wahaClient, "addGroupParticipants").mockResolvedValue({} as any);
    // Pre-seed: 4 of 5 daily slots already used today.
    const today = new Date().toISOString().slice(0, 10);
    sqlite
      .prepare("INSERT INTO tenant_daily_group_limits (id, tenant_id, date, max_daily_limit, members_added) VALUES ('lim', ?, ?, 5, 4)")
      .run(TA, today);
    await groupQueueBatch(
      { group_id: "g-a", phone_numbers: ["1", "2", "3"], batch_size: 5, interval_minutes: 10 },
      ctx(TA),
    );
    await processGroupAddQueue(TA);

    // Only 1 slot left -> only 1 added despite batch_size 5.
    const added = sqlite.prepare("SELECT COUNT(*) AS n FROM whatsapp_group_participants").get() as { n: number };
    expect(added.n).toBe(1);
    const quota = sqlite.prepare("SELECT members_added FROM tenant_daily_group_limits WHERE tenant_id = ?").get(TA) as {
      members_added: number;
    };
    expect(quota.members_added).toBe(5); // capped
  });
});
