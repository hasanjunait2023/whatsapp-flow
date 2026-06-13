import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
// Gateway config must be set before the env module is imported.
process.env.UDDOKTAPAY_API_KEY = "test-key";
process.env.UDDOKTAPAY_BASE_URL = "https://pay.example.com";

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, payments, subscriptionOrders } = await import("../src/db/schema.js");
const { uddoktapayVerify } = await import("../src/routes/payments-fns.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null, isAdmin = false): FnContext {
  return { userId: "u", tenantId, isAdmin };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "u" },
    { id: TENANT_B, name: "B", owner_id: "u2" },
  ]);
  await db
    .insert(subscriptionOrders)
    .values({ id: "so-a", tenant_id: TENANT_A, plan_id: "plan-x", order_number: "SUB-1", amount: 500, status: "pending" });
  await db.insert(payments).values({
    id: "pay-a",
    tenant_id: TENANT_A,
    subscription_id: "so-a",
    amount: 500,
    currency: "BDT",
    payment_method: "uddoktapay",
    uddoktapay_invoice_id: "inv-123",
    status: "pending",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uddoktapay-verify", () => {
  it("marks payment verified and order paid on a COMPLETED gateway response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "COMPLETED", transaction_id: "TXN-9", payment_method: "bkash" }), {
        status: 200,
      }),
    );
    const res = await uddoktapayVerify({ invoice_id: "inv-123" }, ctx(TENANT_A));
    const data = res.data as { success: boolean; status: string; transaction_id: string };
    expect(data.success).toBe(true);
    expect(data.status).toBe("verified");

    const pay = (await dbGet("SELECT status, transaction_id FROM payments WHERE id = 'pay-a'")) as {
      status: string;
      transaction_id: string;
    };
    expect(pay.status).toBe("verified");
    expect(pay.transaction_id).toBe("TXN-9");

    const order = (await dbGet("SELECT status FROM subscription_orders WHERE id = 'so-a'")) as {
      status: string;
    };
    expect(order.status).toBe("paid");
  });

  it("refuses to verify another tenant's payment", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 }),
    );
    const res = await uddoktapayVerify({ invoice_id: "inv-123" }, ctx(TENANT_B));
    const data = res.data as { success: boolean; error?: string };
    expect(data.success).toBe(false);
    expect(data.error).toBe("Forbidden tenant");
  });

  it("returns an error when the invoice is unknown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ status: "PENDING" }), { status: 200 }),
    );
    const res = await uddoktapayVerify({ invoice_id: "nope" }, ctx(TENANT_A));
    const data = res.data as { success: boolean; error?: string };
    expect(data.success).toBe(false);
    expect(data.error).toBe("Payment record not found");
  });
});
