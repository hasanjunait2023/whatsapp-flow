import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { sendMessage } = await import("../src/routes/messaging.js");
const { outboundRateLimiter } = await import("../src/lib/rate-limiter.js");
const { tenants, whatsappInstances, contacts, subscriptions } = await import("../src/db/schema.js");

const TENANT = "mmmm1111-1111-1111-1111-111111111111";
const INSTANCE = "minst222-2222-2222-2222-222222222222";
const CONTACT = "mcont333-3333-3333-3333-333333333333";
const CTX = { userId: "user-1", tenantId: TENANT, isAdmin: false };

// A second tenant whose instance must never be reachable by TENANT (IDOR guard).
const OTHER_TENANT = "oooo9999-9999-9999-9999-999999999999";
const OTHER_INSTANCE = "oinst888-8888-8888-8888-888888888888";

beforeAll(() => {
  runMigrations();
  db.insert(tenants)
    .values([
      { id: TENANT, name: "M", owner_id: "u" },
      { id: OTHER_TENANT, name: "Other", owner_id: "u2" },
    ])
    .run();
  db.insert(subscriptions)
    .values({
      id: "sub-1",
      tenant_id: TENANT,
      plan_id: "p",
      status: "active",
      current_period_start: "2026-01-01",
      current_period_end: "2026-12-31",
    })
    .run();
  db.insert(whatsappInstances)
    .values([
      { id: INSTANCE, tenant_id: TENANT, name: "WA", status: "active", session_id: "default" },
      {
        id: OTHER_INSTANCE,
        tenant_id: OTHER_TENANT,
        name: "OtherWA",
        status: "active",
        session_id: "default",
      },
    ])
    .run();
  db.insert(contacts)
    .values({
      id: CONTACT,
      tenant_id: TENANT,
      instance_id: INSTANCE,
      wa_id: "15551112222@c.us",
      phone_number: "15551112222",
    })
    .run();
});

beforeEach(() => {
  outboundRateLimiter.reset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("send-message function", () => {
  it("calls WAHA sendText with the right shape and returns the exact success contract", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "true_15551112222_WAID" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const res = (await sendMessage(
      { contact_id: CONTACT, content: "hi there", content_type: "text" },
      CTX,
    )) as { data: Record<string, unknown>; error: unknown };

    expect(res.error).toBeNull();
    expect(res.data.success).toBe(true);
    expect(res.data.wa_message_id).toBe("true_15551112222_WAID");
    expect(typeof res.data.message_id).toBe("string");

    // WAHA was called with the mapped chatId + text.
    const call = fetchSpy.mock.calls.find(([url]) => String(url).endsWith("/api/sendText"));
    expect(call).toBeDefined();
    const sent = JSON.parse((call![1] as RequestInit).body as string);
    expect(sent).toMatchObject({ session: "default", chatId: "15551112222@c.us", text: "hi there" });

    // Outbound row was marked sent with the wa_message_id.
    const row = sqlite
      .prepare("SELECT status, wa_message_id, direction FROM messages WHERE id = ?")
      .get(res.data.message_id as string) as { status: string; wa_message_id: string; direction: string };
    expect(row.status).toBe("sent");
    expect(row.direction).toBe("outbound");
    expect(row.wa_message_id).toBe("true_15551112222_WAID");
  });

  it("returns the message-limit contract when usage exceeds the plan cap", async () => {
    // Set usage at the default cap (1000) so the next send is blocked.
    sqlite
      .prepare(
        "INSERT INTO usage_counters (id, tenant_id, period_start, period_end, messages_sent) VALUES (?, ?, ?, ?, 1000)",
      )
      .run(
        "uc-1",
        TENANT,
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        "2026-12-31",
      );

    const res = (await sendMessage(
      { contact_id: CONTACT, content: "blocked" },
      CTX,
    )) as { data: Record<string, unknown> };

    expect(res.data.success).toBe(false);
    expect(res.data.code).toBe("MESSAGE_LIMIT_REACHED");
    expect(res.data.current).toBe(1000);
    expect(res.data.max).toBe(1000);
    expect(res.data.upgrade_required).toBe(true);

    sqlite.prepare("DELETE FROM usage_counters WHERE id = 'uc-1'").run();
  });

  it("blocks a proactive send once the per-number hourly cap is hit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 200 }),
    );
    // Exhaust the proactive bucket for this instance (no inbound → proactive).
    for (let i = 0; i < 29; i++) {
      outboundRateLimiter.check(INSTANCE, false);
    }
    const res = (await sendMessage(
      { contact_id: CONTACT, content: "proactive" },
      CTX,
    )) as { data: Record<string, unknown> };
    expect(res.data.success).toBe(false);
    expect(res.data.code).toBe("RATE_LIMITED");
  });

  it("keeps the row pending and returns failure when WAHA errors permanently", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );
    const res = (await sendMessage(
      { contact_id: CONTACT, content: "will fail" },
      CTX,
    )) as { data: Record<string, unknown> };
    expect(res.data.success).toBe(false);
    const row = sqlite
      .prepare("SELECT status FROM messages WHERE id = ?")
      .get(res.data.message_id as string) as { status: string };
    expect(row.status).toBe("pending");
  });

  it("rejects a foreign instance_id instead of routing through another tenant (IDOR)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "x" }), { status: 200 }),
    );
    const res = (await sendMessage(
      { contact_id: CONTACT, content: "leak", instance_id: OTHER_INSTANCE },
      CTX,
    )) as { data: Record<string, unknown> };

    // Must be rejected, not silently sent through the caller's default instance.
    expect(res.data.success).toBe(false);
    expect(res.data.error).toBe("Instance not found");
    // No WAHA send must have happened.
    expect(fetchSpy.mock.calls.some(([url]) => String(url).endsWith("/api/sendText"))).toBe(false);
    // No outbound row should have been created for this attempt.
    const count = sqlite
      .prepare("SELECT COUNT(*) AS n FROM messages WHERE content = 'leak'")
      .get() as { n: number };
    expect(count.n).toBe(0);
  });

  it("rejects an unknown explicit instance_id with an explicit error", async () => {
    const res = (await sendMessage(
      { contact_id: CONTACT, content: "x", instance_id: "does-not-exist" },
      CTX,
    )) as { data: Record<string, unknown> };
    expect(res.data.success).toBe(false);
    expect(res.data.error).toBe("Instance not found");
  });

  it("ignores a foreign reply_to_id (cross-tenant) and sends without a reply target", async () => {
    // Plant a message under the OTHER tenant; its id must not be usable as a reply.
    sqlite
      .prepare(
        `INSERT INTO messages (id, tenant_id, instance_id, contact_id, direction, status, content_type, wa_message_id)
         VALUES ('foreign-msg', ?, ?, NULL, 'inbound', 'delivered', 'text', 'foreign-wamid')`,
      )
      .run(OTHER_TENANT, OTHER_INSTANCE);

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "sent-id" }), { status: 200 }),
    );

    const res = (await sendMessage(
      { contact_id: CONTACT, content: "reply attempt", reply_to_id: "foreign-msg" },
      CTX,
    )) as { data: Record<string, unknown> };

    expect(res.data.success).toBe(true);
    const call = fetchSpy.mock.calls.find(([url]) => String(url).endsWith("/api/sendText"));
    const sent = JSON.parse((call![1] as RequestInit).body as string);
    // The foreign wa_message_id must NOT have leaked into the reply target.
    expect(sent.reply_to ?? null).toBeNull();
  });
});
