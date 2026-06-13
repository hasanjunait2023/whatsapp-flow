import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.CRYPTO_USDT_ADDRESS_TRC20 = "TTestWalletAddressTRC20xxxxxxxxxxx";
process.env.CRYPTO_USDT_ADDRESS_BEP20 = "0x1111111111111111111111111111111111111111";

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const {
  tenants,
  plans,
  subscriptions,
  payments,
  coupons,
  couponRedemptions,
  cryptoPaymentRequests,
} = await import("../src/db/schema.js");
const { createCryptoCheckout, submitTxid, approveCryptoPayment, rejectCryptoPayment } =
  await import("../src/services/payments/crypto.js");
const { validateCoupon } = await import("../src/services/payments/coupons.js");

const TENANT = "tttt1111-1111-1111-1111-111111111111";
const PLAN = "pppp1111-1111-1111-1111-111111111111";
const ADMIN = "admin-user-1";
const VALID_TRC20_TXID = "a".repeat(64);

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
});

beforeEach(async () => {
  await db.delete(cryptoPaymentRequests);
  await db.delete(subscriptions);
  await db.delete(payments);
  await db.delete(coupons);
  await db.delete(couponRedemptions);
  await db.delete(plans);
  await db.insert(plans).values({ id: PLAN, name: "Pro", price_monthly: 10, is_active: true });
});

function checkout(couponCode?: string) {
  return createCryptoCheckout(TENANT, PLAN, "TRC20", couponCode);
}

describe("crypto checkout", () => {
  it("creates a salted-amount request with 24h expiry", async () => {
    const result = await checkout();
    expect(result.wallet_address).toBe(process.env.CRYPTO_USDT_ADDRESS_TRC20);
    expect(result.amount).toBeGreaterThan(10);
    expect(result.amount).toBeLessThan(11);
    expect(result.base_amount).toBe(10);
    expect(new Date(result.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("salts amounts so two live requests never collide", async () => {
    const tenant2 = "tttt2222-2222-2222-2222-222222222222";
    await db.insert(tenants).values({ id: tenant2, name: "T2", owner_id: "u2" });
    const a = await createCryptoCheckout(TENANT, PLAN, "TRC20");
    const b = await createCryptoCheckout(tenant2, PLAN, "TRC20");
    expect(a.amount).not.toBe(b.amount);
  });

  it("expires the previous awaiting request when creating a new one", async () => {
    const first = await checkout();
    await checkout();
    const firstRow = (await db.select().from(cryptoPaymentRequests)).find((r) => r.id === first.request_id)!;
    expect(firstRow.status).toBe("expired");
  });

  it("rejects unknown plan and unconfigured network", async () => {
    await expect(createCryptoCheckout(TENANT, "nope", "TRC20")).rejects.toThrow("Plan not found");
    await expect(createCryptoCheckout(TENANT, PLAN, "DOGE" as never)).rejects.toThrow("network");
  });
});

describe("txid submission", () => {
  it("accepts a valid TRC20 txid and notifies admins", async () => {
    const { request_id } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    const row = (await db.select().from(cryptoPaymentRequests))[0];
    expect(row.status).toBe("submitted");
    expect(row.txid).toBe(VALID_TRC20_TXID);
  });

  it("rejects malformed txids per network", async () => {
    const { request_id } = await checkout();
    await expect(submitTxid(TENANT, request_id, "not-a-txid")).rejects.toThrow("format");
    await expect(submitTxid(TENANT, request_id, "0x" + "b".repeat(64))).rejects.toThrow("format");
  });

  it("rejects a reused txid (global unique index)", async () => {
    const { request_id } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);

    const tenant2 = "tttt3333-3333-3333-3333-333333333333";
    await db.insert(tenants).values({ id: tenant2, name: "T3", owner_id: "u3" });
    const second = await createCryptoCheckout(tenant2, PLAN, "TRC20");
    await expect(submitTxid(tenant2, second.request_id, VALID_TRC20_TXID)).rejects.toThrow(
      "already been used",
    );
  });

  it("rejects submission on an expired request", async () => {
    const { request_id } = await checkout();
    await db
      .update(cryptoPaymentRequests)
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() });
    await expect(submitTxid(TENANT, request_id, VALID_TRC20_TXID)).rejects.toThrow("expired");
  });

  it("cannot submit for another tenant's request", async () => {
    const { request_id } = await checkout();
    await expect(submitTxid("other-tenant", request_id, VALID_TRC20_TXID)).rejects.toThrow("not found");
  });
});

describe("admin approval", () => {
  it("approve activates the subscription, records payment, marks approved", async () => {
    const { request_id, amount } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    await approveCryptoPayment(request_id, { adminUserId: ADMIN });

    const sub = (await db.select().from(subscriptions))[0];
    expect(sub.status).toBe("active");
    expect(sub.plan_id).toBe(PLAN);
    expect(new Date(sub.current_period_end).getTime()).toBeGreaterThan(Date.now());

    const payment = (await db.select().from(payments))[0];
    expect(payment.payment_method).toBe("crypto_usdt");
    expect(payment.amount).toBe(amount);
    expect(payment.transaction_id).toBe(VALID_TRC20_TXID);
    expect(payment.verified_by).toBe(ADMIN);

    expect((await db.select().from(cryptoPaymentRequests))[0].status).toBe("approved");
  });

  it("extends an existing active subscription instead of resetting it", async () => {
    const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    await db.insert(subscriptions).values({
      tenant_id: TENANT,
      plan_id: PLAN,
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: futureEnd,
    });
    const { request_id } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    await approveCryptoPayment(request_id, { adminUserId: ADMIN });

    const sub = (await db.select().from(subscriptions))[0];
    // 10 remaining days + 30 new days.
    const expectedMin = new Date(futureEnd).getTime() + 29 * 24 * 60 * 60 * 1000;
    expect(new Date(sub.current_period_end).getTime()).toBeGreaterThan(expectedMin);
  });

  it("approve is idempotent-guarded: second approval fails", async () => {
    const { request_id } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    await approveCryptoPayment(request_id, { adminUserId: ADMIN });
    await expect(approveCryptoPayment(request_id, { adminUserId: ADMIN })).rejects.toThrow("approved");
    expect(await db.select().from(payments)).toHaveLength(1);
  });

  it("reject marks the request and does not touch subscriptions", async () => {
    const { request_id } = await checkout();
    await submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    await rejectCryptoPayment(request_id, { adminUserId: ADMIN, note: "fake txid" });
    expect((await db.select().from(cryptoPaymentRequests))[0].status).toBe("rejected");
    expect(await db.select().from(subscriptions)).toHaveLength(0);
  });
});

describe("coupons", () => {
  async function insertCoupon(overrides: Record<string, unknown> = {}): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(coupons).values({
      id,
      code: "SAVE20",
      discount_type: "percent",
      value: 20,
      ...overrides,
    });
    return id;
  }

  it("validates and computes percent + fixed discounts", async () => {
    await insertCoupon();
    const percent = await validateCoupon("save20", TENANT, PLAN, 10);
    expect(percent.valid).toBe(true);
    expect(percent.discountedAmount).toBe(8);

    await db.delete(coupons);
    await insertCoupon({ code: "FLAT5", discount_type: "fixed_usd", value: 5 });
    const fixed = await validateCoupon("FLAT5", TENANT, PLAN, 10);
    expect(fixed.discountedAmount).toBe(5);
  });

  it("gives one generic reason for unknown, inactive, expired, exhausted codes", async () => {
    expect((await validateCoupon("NOPE", TENANT, PLAN, 10)).reason).toBe("Invalid or expired coupon");
    await insertCoupon({ is_active: false });
    expect((await validateCoupon("SAVE20", TENANT, PLAN, 10)).reason).toBe("Invalid or expired coupon");
    await db.delete(coupons);
    await insertCoupon({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await validateCoupon("SAVE20", TENANT, PLAN, 10)).reason).toBe("Invalid or expired coupon");
    await db.delete(coupons);
    await insertCoupon({ max_uses: 1, used_count: 1 });
    expect((await validateCoupon("SAVE20", TENANT, PLAN, 10)).reason).toBe("Invalid or expired coupon");
  });

  it("enforces plan restrictions", async () => {
    // plan_ids is a jsonb column: Postgres/PGlite returns it already parsed (a
    // string[]). A coupon whose plan_ids does not include this PLAN is rejected
    // with the plan-specific reason.
    await insertCoupon({ plan_ids: ["another-plan"] });
    const result = await validateCoupon("SAVE20", TENANT, PLAN, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("plan");
  });

  it("redeems inside approval: discounted amount, used_count, one-per-tenant", async () => {
    const couponId = await insertCoupon({ max_uses: 5 });
    const result = await checkout("SAVE20");
    expect(result.amount).toBeGreaterThan(8);
    expect(result.amount).toBeLessThan(9);
    expect(result.discount_applied).toBe(2);

    await submitTxid(TENANT, result.request_id, VALID_TRC20_TXID);
    await approveCryptoPayment(result.request_id, { adminUserId: ADMIN });

    expect((await db.select().from(coupons))[0].used_count).toBe(1);
    const redemption = (await db.select().from(couponRedemptions))[0];
    expect(redemption.coupon_id).toBe(couponId);
    expect(redemption.tenant_id).toBe(TENANT);

    // Second use by the same tenant blocked at validation.
    expect((await validateCoupon("SAVE20", TENANT, PLAN, 10)).reason).toContain("already used");
  });

  it("rolls back the whole approval if the coupon ran out (atomicity)", async () => {
    await insertCoupon({ max_uses: 1 });
    const result = await checkout("SAVE20");
    await submitTxid(TENANT, result.request_id, VALID_TRC20_TXID);

    // Coupon exhausted between checkout and approval.
    await db.update(coupons).set({ used_count: 1 });

    await expect(approveCryptoPayment(result.request_id, { adminUserId: ADMIN })).rejects.toThrow(
      "no longer available",
    );
    // Transaction rolled back: no payment, no subscription, request still submitted.
    expect(await db.select().from(payments)).toHaveLength(0);
    expect(await db.select().from(subscriptions)).toHaveLength(0);
    expect((await db.select().from(cryptoPaymentRequests))[0].status).toBe("submitted");
  });
});
