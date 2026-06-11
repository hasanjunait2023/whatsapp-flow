import { describe, it, expect, beforeAll, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, orders, invoiceSettings } = await import("../src/db/schema.js");
const { generateInvoice, mergeInvoices } = await import("../src/routes/misc-fns.js");
const { DEFERRED_HANDLERS } = await import("../src/routes/deferred-fns.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null, isAdmin = false): FnContext {
  return { userId: "user-a", tenantId, isAdmin };
}

beforeAll(() => {
  runMigrations();
  db.insert(tenants)
    .values([
      { id: TENANT_A, name: "A", owner_id: "user-a" },
      { id: TENANT_B, name: "B", owner_id: "user-b" },
    ])
    .run();
  db.insert(orders)
    .values([
      { id: "order-a", tenant_id: TENANT_A, order_number: "ORD-000001", total: 150 },
      { id: "order-b", tenant_id: TENANT_B, order_number: "ORD-000001", total: 999 },
    ])
    .run();
  db.insert(invoiceSettings)
    .values({ id: "is-a", tenant_id: TENANT_A, invoice_prefix: "INV-", next_invoice_number: 7 })
    .run();
});

describe("generate-invoice", () => {
  it("creates an invoice row with a prefixed sequential number and bumps the counter", async () => {
    const res = await generateInvoice({ order_id: "order-a" }, ctx(TENANT_A));
    const data = res.data as { success: boolean; invoice_number: string; invoice_id: string };
    expect(data.success).toBe(true);
    expect(data.invoice_number).toBe("INV-00007");

    const row = sqlite
      .prepare("SELECT total, tenant_id FROM invoices WHERE id = ?")
      .get(data.invoice_id) as { total: number; tenant_id: string };
    expect(row.total).toBe(150);
    expect(row.tenant_id).toBe(TENANT_A);

    const settings = sqlite
      .prepare("SELECT next_invoice_number AS n FROM invoice_settings WHERE tenant_id = ?")
      .get(TENANT_A) as { n: number };
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
    const aInv = sqlite.prepare("SELECT id FROM invoices WHERE tenant_id = ?").get(TENANT_A) as { id: string };
    const bInv = sqlite.prepare("SELECT id FROM invoices WHERE tenant_id = ?").get(TENANT_B) as { id: string };
    const res = await mergeInvoices({ invoice_ids: [aInv.id, bInv.id] }, ctx(TENANT_A));
    const data = res.data as { error?: string };
    expect(data.error).toBe("Some invoices were not found in your tenant");
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
