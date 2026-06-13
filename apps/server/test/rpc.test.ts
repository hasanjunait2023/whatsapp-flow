import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { rpcRoute } = await import("../src/routes/rpc.js");
const { tenants, contacts, messages } = await import("../src/db/schema.js");
import { Hono } from "hono";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";
const CONTACT_A = "contact-aaaa";
const CONTACT_B = "contact-bbbb";

// Mount the rpc route with an injected tenant context to bypass auth.
const app = new Hono();
app.use("*", async (c, next) => {
  c.set("tenant", {
    userId: "u",
    tenantId: TENANT_A,
    isAdmin: false,
    isImpersonating: false,
  });
  await next();
});
app.route("/rpc", rpcRoute);

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "u" },
    { id: TENANT_B, name: "B", owner_id: "u2" },
  ]);
  await db.insert(contacts).values([
    { id: CONTACT_A, tenant_id: TENANT_A, wa_id: "a@s", phone_number: "1" },
    { id: CONTACT_B, tenant_id: TENANT_B, wa_id: "b@s", phone_number: "2" },
  ]);

  // Two messages for contact A; the latest should win.
  await db.insert(messages).values([
    {
      tenant_id: TENANT_A,
      contact_id: CONTACT_A,
      direction: "inbound",
      content: "old message",
      content_type: "text",
      wa_message_id: "m1",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      tenant_id: TENANT_A,
      contact_id: CONTACT_A,
      direction: "outbound",
      content: "newest message",
      content_type: "text",
      wa_message_id: "m2",
      created_at: "2026-01-02T00:00:00.000Z",
    },
    // Cross-tenant message must never leak.
    {
      tenant_id: TENANT_B,
      contact_id: CONTACT_B,
      direction: "inbound",
      content: "tenant B secret",
      content_type: "text",
      wa_message_id: "m3",
      created_at: "2026-01-03T00:00:00.000Z",
    },
  ]);
});

describe("get_last_messages_for_contacts RPC", () => {
  it("returns the most recent message per contact, tenant-scoped", async () => {
    const res = await app.request("/rpc/get_last_messages_for_contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_contact_ids: [CONTACT_A, CONTACT_B] }),
    });
    const json = (await res.json()) as {
      data: Array<{ contact_id: string; content: string; direction: string }>;
      error: unknown;
    };
    expect(json.error).toBeNull();
    expect(json.data).toHaveLength(1); // contact B belongs to tenant B, excluded
    expect(json.data[0].contact_id).toBe(CONTACT_A);
    expect(json.data[0].content).toBe("newest message");
    expect(json.data[0].direction).toBe("outbound");
  });

  it("returns an empty array for no contact ids", async () => {
    const res = await app.request("/rpc/get_last_messages_for_contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_contact_ids: [] }),
    });
    const json = (await res.json()) as { data: unknown[]; error: unknown };
    expect(json.data).toEqual([]);
  });

  it("404s on an unknown rpc", async () => {
    const res = await app.request("/rpc/does_not_exist", {
      method: "POST",
      body: "{}",
    });
    expect(res.status).toBe(404);
  });
});
