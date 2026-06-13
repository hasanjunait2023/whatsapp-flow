import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, orders, invoiceSettings, whatsappInstances, contacts, messages } = await import(
  "../src/db/schema.js"
);
const { generateInvoice, mergeInvoices, forwardMessage } = await import("../src/routes/misc-fns.js");
const { DEFERRED_HANDLERS } = await import("../src/routes/deferred-fns.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null, isAdmin = false): FnContext {
  return { userId: "user-a", tenantId, isAdmin };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "user-a" },
    { id: TENANT_B, name: "B", owner_id: "user-b" },
  ]);
  await db.insert(orders).values([
    { id: "order-a", tenant_id: TENANT_A, order_number: "ORD-000001", total: 150 },
    { id: "order-b", tenant_id: TENANT_B, order_number: "ORD-000001", total: 999 },
  ]);
  await db
    .insert(invoiceSettings)
    .values({ id: "is-a", tenant_id: TENANT_A, invoice_prefix: "INV-", next_invoice_number: 7 });

  // forward-message IDOR fixtures: instance + contact for A, a secret message in B.
  await db
    .insert(whatsappInstances)
    .values({ id: "inst-a", tenant_id: TENANT_A, name: "A", status: "active", phone_number: "111" });
  await db.insert(contacts).values([
    { id: "ca", tenant_id: TENANT_A, wa_id: "a@s", phone_number: "111", instance_id: "inst-a" },
    { id: "cb", tenant_id: TENANT_B, wa_id: "b@s", phone_number: "222" },
  ]);
  await db.insert(messages).values({
    id: "msg-b-secret",
    tenant_id: TENANT_B,
    contact_id: "cb",
    direction: "inbound",
    content: "TENANT-B-SECRET",
    content_type: "text",
    wa_message_id: "wamid-b",
  });
});

describe("generate-invoice", () => {
  it("creates an invoice row with a prefixed sequential number and bumps the counter", async () => {
    const res = await generateInvoice({ order_id: "order-a" }, ctx(TENANT_A));
    const data = res.data as { success: boolean; invoice_number: string; invoice_id: string };
    expect(data.success).toBe(true);
    expect(data.invoice_number).toBe("INV-00007");

    const row = (await dbGet(
      "SELECT total, tenant_id FROM invoices WHERE id = ?",
      data.invoice_id,
    )) as { total: number; tenant_id: string };
    expect(row.total).toBe(150);
    expect(row.tenant_id).toBe(TENANT_A);

    const settings = (await dbGet(
      "SELECT next_invoice_number AS n FROM invoice_settings WHERE tenant_id = ?",
      TENANT_A,
    )) as { n: number };
    expect(settings.n).toBe(8);
  });

  it("is idempotent — re-generating returns the existing invoice", async () => {
    const res = await generateInvoice({ order_id: "order-a" }, ctx(TENANT_A));
    const data = res.data as { reused?: boolean };
    expect(data.reused).toBe(true);
  });

  it("refuses to generate an invoice for another tenant's order", async () => {
    const res = await generateInvoice({ order_id: "order-b" }, ctx(TENANT_A));
    const data = res.data as { error?: string };
    expect(data.error).toBe("Forbidden order");
  });
});

describe("merge-invoices tenant scoping", () => {
  it("rejects merging when an invoice is outside the tenant", async () => {
    // order-a's invoice belongs to A; create one for B and try to merge across.
    await generateInvoice({ order_id: "order-b" }, ctx(TENANT_B, true));
    const aInv = (await dbGet("SELECT id FROM invoices WHERE tenant_id = ?", TENANT_A)) as { id: string };
    const bInv = (await dbGet("SELECT id FROM invoices WHERE tenant_id = ?", TENANT_B)) as { id: string };
    const res = await mergeInvoices({ invoice_ids: [aInv.id, bInv.id] }, ctx(TENANT_A));
    const data = res.data as { error?: string };
    expect(data.error).toBe("Some invoices were not found in your tenant");
  });
});

describe("forward-message cross-tenant isolation", () => {
  it("refuses to forward another tenant's message (IDOR) — source not found", async () => {
    const res = await forwardMessage(
      { message_ids: ["msg-b-secret"], instance_id: "inst-a", target_contact_id: "ca" },
      ctx(TENANT_A),
    );
    const data = res.data as { success: boolean; results: Array<{ success: boolean; error?: string }> };
    expect(data.success).toBe(false);
    expect(data.results[0].success).toBe(false);
    expect(data.results[0].error).toBe("Source message not found");
  });
});

describe("deferred-v1 fns degrade gracefully", () => {
  it("return the feature_disabled envelope, not a 501", async () => {
    for (const name of Object.keys(DEFERRED_HANDLERS)) {
      const handler = DEFERRED_HANDLERS[name as keyof typeof DEFERRED_HANDLERS];
      const res = await handler({}, ctx(TENANT_A));
      expect(res.data).toBeNull();
      expect(res.error).toEqual({ message: "feature_disabled_v1", code: "feature_disabled" });
    }
  });
});
