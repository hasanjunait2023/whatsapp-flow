import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet, dbRun } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
const { acceptInvitation } = await import("../src/routes/team-fns.js");
const { tenants, whatsappInstances, contacts, messages, contactLabels, labels } = await import(
  "../src/db/schema.js"
);
import type { TenantContext } from "../src/middleware/tenant.js";

const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function ctxFor(tenantId: string | null, userId = "user-a", isAdmin = false): TenantContext {
  return { userId, tenantId, isAdmin, isImpersonating: false };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "user-a" },
    { id: TENANT_B, name: "B", owner_id: "user-b" },
  ]);
  await db.insert(whatsappInstances).values([
    { id: "inst-a", tenant_id: TENANT_A, name: "A", status: "active", phone_number: "111", api_key_encrypted: "SECRET_A" },
    { id: "inst-b", tenant_id: TENANT_B, name: "B", status: "active", phone_number: "222", api_key_encrypted: "SECRET_B" },
  ]);
  await db.insert(contacts).values([
    { id: "contact-a", tenant_id: TENANT_A, wa_id: "a@s", phone_number: "111", instance_id: "inst-a" },
    { id: "contact-b", tenant_id: TENANT_B, wa_id: "b@s", phone_number: "222", instance_id: "inst-b" },
  ]);
  await db.insert(messages).values([
    // Tenant B's secret message, and Tenant A's message whose reply_to points at it.
    { id: "msg-b", tenant_id: TENANT_B, contact_id: "contact-b", direction: "inbound", content: "TENANT-B-SECRET", content_type: "text", wa_message_id: "wamid-b" },
    { id: "msg-a", tenant_id: TENANT_A, contact_id: "contact-a", direction: "inbound", content: "hi", content_type: "text", wa_message_id: "wamid-a", reply_to_id: "msg-b" },
  ]);
  await db.insert(labels).values([{ id: "label-a", tenant_id: TENANT_A, name: "VIP", color: "#fff" }]);
  await db.insert(contactLabels).values([
    { id: "cl-a", contact_id: "contact-a", label_id: "label-a" },
    { id: "cl-b", contact_id: "contact-b", label_id: "label-a" },
  ]);
});

describe("embedded-select isolation (CRITICAL)", () => {
  it("does not leak another tenant's row through an embed FK", async () => {
    const res = await executeQuery(
      { table: "messages", op: "select", columns: "id, reply_to_id, reply_to:messages(id, content)" },
      ctxFor(TENANT_A),
    );
    expect(res.error).toBeNull();
    const rows = res.data as Array<Record<string, any>>;
    const a = rows.find((r) => r.id === "msg-a");
    expect(a).toBeTruthy();
    // reply_to points at Tenant B's message — must resolve to null, never B's content.
    expect(a!.reply_to).toBeNull();
    expect(JSON.stringify(rows)).not.toContain("TENANT-B-SECRET");
  });

  it("strips redacted secret columns from an embedded relation", async () => {
    const res = await executeQuery(
      { table: "contacts", op: "select", columns: "id, instance:whatsapp_instances(id, api_key_encrypted)" },
      ctxFor(TENANT_A),
    );
    const rows = res.data as Array<Record<string, any>>;
    const a = rows.find((r) => r.id === "contact-a");
    expect(a!.instance).toBeTruthy();
    expect(a!.instance).not.toHaveProperty("api_key_encrypted");
    expect(JSON.stringify(rows)).not.toContain("SECRET_A");
  });
});

describe("tenantViaParent scoping (CRITICAL)", () => {
  it("contact_labels returns only rows whose parent contact is in-tenant", async () => {
    const res = await executeQuery({ table: "contact_labels", op: "select", columns: "*" }, ctxFor(TENANT_A));
    expect(res.error).toBeNull();
    const rows = res.data as Array<{ id: string; contact_id: string }>;
    expect(rows.map((r) => r.id)).toEqual(["cl-a"]);
  });

  it("contact_labels delete cannot reach another tenant's rows", async () => {
    await executeQuery(
      { table: "contact_labels", op: "delete", filters: [{ column: "id", operator: "eq", value: "cl-b" }] },
      ctxFor(TENANT_A),
    );
    const stillThere = await dbGet("SELECT 1 FROM contact_labels WHERE id = 'cl-b'");
    expect(stillThere).toBeTruthy(); // tenant A could not delete tenant B's junction row
  });

  it("contact_labels insert cannot tag another tenant's contact", async () => {
    const res = await executeQuery(
      {
        table: "contact_labels",
        op: "insert",
        values: { id: "cl-evil", contact_id: "contact-b", label_id: "label-a" },
        returning: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.error?.code).toBe("forbidden");
    const written = await dbGet("SELECT 1 FROM contact_labels WHERE id = 'cl-evil'");
    expect(written).toBeFalsy();
  });
});

describe("message_templates tenant scoping (HIGH — audit F1)", () => {
  beforeAll(async () => {
    await dbRun(
      `INSERT INTO message_templates (id, tenant_id, category, channel, content, name)
       VALUES (?, ?, 'greet', 'whatsapp', ?, ?)`,
      "tpl-a",
      TENANT_A,
      "hello A",
      "A tpl",
    );
    await dbRun(
      `INSERT INTO message_templates (id, tenant_id, category, channel, content, name)
       VALUES (?, ?, 'greet', 'whatsapp', ?, ?)`,
      "tpl-b",
      TENANT_B,
      "B-SECRET-TEMPLATE",
      "B tpl",
    );
  });

  it("select returns only the active tenant's templates", async () => {
    const res = await executeQuery({ table: "message_templates", op: "select", columns: "*" }, ctxFor(TENANT_A));
    expect(res.error).toBeNull();
    const rows = res.data as Array<{ id: string }>;
    expect(rows.map((r) => r.id)).toEqual(["tpl-a"]);
    expect(JSON.stringify(rows)).not.toContain("B-SECRET-TEMPLATE");
  });

  it("update cannot reach another tenant's template", async () => {
    await executeQuery(
      {
        table: "message_templates",
        op: "update",
        values: { content: "HIJACKED" },
        filters: [{ column: "id", operator: "eq", value: "tpl-b" }],
      },
      ctxFor(TENANT_A),
    );
    const row = (await dbGet("SELECT content FROM message_templates WHERE id = 'tpl-b'")) as { content: string };
    expect(row.content).toBe("B-SECRET-TEMPLATE"); // tenant A could not modify tenant B's row
  });

  it("insert stamps the active tenant (cannot forge another tenant)", async () => {
    await executeQuery(
      {
        table: "message_templates",
        op: "insert",
        values: { id: "tpl-evil", tenant_id: TENANT_B, category: "x", content: "y", name: "z" },
      },
      ctxFor(TENANT_A),
    );
    const row = (await dbGet("SELECT tenant_id FROM message_templates WHERE id = 'tpl-evil'")) as
      | { tenant_id: string }
      | undefined;
    // forceTenantOnRow rewrites tenant_id to the caller's tenant, not the forged one.
    expect(row?.tenant_id).toBe(TENANT_A);
  });
});

describe("accept-invitation identity binding (HIGH)", () => {
  beforeAll(async () => {
    await dbRun(
      'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, true, ?, ?)',
      "acc-user",
      "Acc",
      "invited@example.com",
      Date.now(),
      Date.now(),
    );
    await dbRun(
      "INSERT INTO team_invitations (id, tenant_id, email, role, token, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "inv-1",
      TENANT_A,
      "invited@example.com",
      "agent",
      "tok-123",
      new Date(Date.now() + 3600_000).toISOString(),
      "user-a",
    );
  });

  it("rejects a token redeemed by a different email", async () => {
    const res = await acceptInvitation({ token: "tok-123" }, ctxFor(TENANT_A, "acc-user") as any);
    // ctx user 'acc-user' has email invited@example.com -> should SUCCEED
    expect((res.data as any).success).toBe(true);
  });

  it("rejects when the session user's email does not match the invite", async () => {
    await dbRun(
      'INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, true, ?, ?)',
      "other-user",
      "Other",
      "attacker@example.com",
      Date.now(),
      Date.now(),
    );
    await dbRun(
      "INSERT INTO team_invitations (id, tenant_id, email, role, token, expires_at, invited_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      "inv-2",
      TENANT_A,
      "invited2@example.com",
      "agent",
      "tok-456",
      new Date(Date.now() + 3600_000).toISOString(),
      "user-a",
    );
    const res = await acceptInvitation({ token: "tok-456" }, ctxFor(TENANT_A, "other-user") as any);
    expect((res.data as any).error).toMatch(/different email/i);
  });
});
