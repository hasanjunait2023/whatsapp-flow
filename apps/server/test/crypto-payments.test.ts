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

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" }).run();
});

beforeEach(() => {
  db.delete(cryptoPaymentRequests).run();
  db.delete(subscriptions).run();
  db.delete(payments).run();
  db.delete(coupons).run();
  db.delete(couponRedemptions).run();
  db.delete(plans).run();
  db.insert(plans).values({ id: PLAN, name: "Pro", price_monthly: 10, is_active: true }).run();
});

function checkout(couponCode?: string) {
  return createCryptoCheckout(TENANT, PLAN, "TRC20", couponCode);
}

describe("crypto checkout", () => {
  it("creates a salted-amount request with 24h expiry", () => {
    const result = checkout();
    expect(result.wallet_address).toBe(process.env.CRYPTO_USDT_ADDRESS_TRC20);
    expect(result.amount).toBeGreaterThan(10);
    expect(result.amount).toBeLessThan(11);
    expect(result.base_amount).toBe(10);
    expect(new Date(result.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("salts amounts so two live requests never collide", () => {
    const tenant2 = "tttt2222-2222-2222-2222-222222222222";
    db.insert(tenants).values({ id: tenant2, name: "T2", owner_id: "u2" }).run();
    const a = createCryptoCheckout(TENANT, PLAN, "TRC20");
    const b = createCryptoCheckout(tenant2, PLAN, "TRC20");
    expect(a.amount).not.toBe(b.amount);
  });

  it("expires the previous awaiting request when creating a new one", () => {
    const first = checkout();
    checkout();
    const firstRow = db.select().from(cryptoPaymentRequests).all().find((r) => r.id === first.request_id)!;
    expect(firstRow.status).toBe("expired");
  });

  it("rejects unknown plan and unconfigured network", () => {
    expect(() => createCryptoCheckout(TENANT, "nope", "TRC20")).toThrow("Plan not found");
    expect(() => createCryptoCheckout(TENANT, PLAN, "DOGE" as never)).toThrow("network");
  });
});

describe("txid submission", () => {
  it("accepts a valid TRC20 txid and notifies admins", () => {
    const { request_id } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    const row = db.select().from(cryptoPaymentRequests).all()[0];
    expect(row.status).toBe("submitted");
    expect(row.txid).toBe(VALID_TRC20_TXID);
  });

  it("rejects malformed txids per network", () => {
    const { request_id } = checkout();
    expect(() => submitTxid(TENANT, request_id, "not-a-txid")).toThrow("format");
    expect(() => submitTxid(TENANT, request_id, "0x" + "b".repeat(64))).toThrow("format");
  });

  it("rejects a reused txid (global unique index)", () => {
    const { request_id } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);

    const tenant2 = "tttt3333-3333-3333-3333-333333333333";
    db.insert(tenants).values({ id: tenant2, name: "T3", owner_id: "u3" }).run();
    const second = createCryptoCheckout(tenant2, PLAN, "TRC20");
    expect(() => submitTxid(tenant2, second.request_id, VALID_TRC20_TXID)).toThrow(
      "already been used",
    );
  });

  it("rejects submission on an expired request", () => {
    const { request_id } = checkout();
    db.update(cryptoPaymentRequests)
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .run();
    expect(() => submitTxid(TENANT, request_id, VALID_TRC20_TXID)).toThrow("expired");
  });

  it("cannot submit for another tenant's request", () => {
    const { request_id } = checkout();
    expect(() => submitTxid("other-tenant", request_id, VALID_TRC20_TXID)).toThrow("not found");
  });
});

describe("admin approval", () => {
  it("approve activates the subscription, records payment, marks approved", () => {
    const { request_id, amount } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    approveCryptoPayment(request_id, { adminUserId: ADMIN });

    const sub = db.select().from(subscriptions).all()[0];
    expect(sub.status).toBe("active");
    expect(sub.plan_id).toBe(PLAN);
    expect(new Date(sub.current_period_end).getTime()).toBeGreaterThan(Date.now());

    const payment = db.select().from(payments).all()[0];
    expect(payment.payment_method).toBe("crypto_usdt");
    expect(payment.amount).toBe(amount);
    expect(payment.transaction_id).toBe(VALID_TRC20_TXID);
    expect(payment.verified_by).toBe(ADMIN);

    expect(db.select().from(cryptoPaymentRequests).all()[0].status).toBe("approved");
  });

  it("extends an existing active subscription instead of resetting it", () => {
    const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    db.insert(subscriptions)
      .values({
        tenant_id: TENANT,
        plan_id: PLAN,
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: futureEnd,
      })
      .run();
    const { request_id } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    approveCryptoPayment(request_id, { adminUserId: ADMIN });

    const sub = db.select().from(subscriptions).all()[0];
    // 10 remaining days + 30 new days.
    const expectedMin = new Date(futureEnd).getTime() + 29 * 24 * 60 * 60 * 1000;
    expect(new Date(sub.current_period_end).getTime()).toBeGreaterThan(expectedMin);
  });

  it("approve is idempotent-guarded: second approval fails", () => {
    const { request_id } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    approveCryptoPayment(request_id, { adminUserId: ADMIN });
    expect(() => approveCryptoPayment(request_id, { adminUserId: ADMIN })).toThrow("approved");
    expect(db.select().from(payments).all()).toHaveLength(1);
  });

  it("reject marks the request and does not touch subscriptions", () => {
    const { request_id } = checkout();
    submitTxid(TENANT, request_id, VALID_TRC20_TXID);
    rejectCryptoPayment(request_id, { adminUserId: ADMIN, note: "fake txid" });
    expect(db.select().from(cryptoPaymentRequests).all()[0].status).toBe("rejected");
    expect(db.select().from(subscriptions).all()).toHaveLength(0);
  });
});

describe("coupons", () => {
  function insertCoupon(overrides: Record<string, unknown> = {}): string {
    const id = crypto.randomUUID();
    db.insert(coupons)
      .values({
        id,
        code: "SAVE20",
        discount_type: "percent",
        value: 20,
        ...overrides,
      })
      .run();
    return id;
  }

  it("validates and computes percent + fixed discounts", () => {
    insertCoupon();
    const percent = validateCoupon("save20", TENANT, PLAN, 10);
    expect(percent.valid).toBe(true);
    expect(percent.discountedAmount).toBe(8);

    db.delete(coupons).run();
    insertCoupon({ code: "FLAT5", discount_type: "fixed_usd", value: 5 });
    const fixed = validateCoupon("FLAT5", TENANT, PLAN, 10);
    expect(fixed.discountedAmount).toBe(5);
  });

  it("gives one generic reason for unknown, inactive, expired, exhausted codes", () => {
    expect(validateCoupon("NOPE", TENANT, PLAN, 10).reason).toBe("Invalid or expired coupon");
    insertCoupon({ is_active: false });
    expect(validateCoupon("SAVE20", TENANT, PLAN, 10).reason).toBe("Invalid or expired coupon");
    db.delete(coupons).run();
    insertCoupon({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(validateCoupon("SAVE20", TENANT, PLAN, 10).reason).toBe("Invalid or expired coupon");
    db.delete(coupons).run();
    insertCoupon({ max_uses: 1, used_count: 1 });
    expect(validateCoupon("SAVE20", TENANT, PLAN, 10).reason).toBe("Invalid or expired coupon");
  });

  it("enforces plan restrictions", () => {
    insertCoupon({ plan_ids: ["another-plan"] });
    const result = validateCoupon("SAVE20", TENANT, PLAN, 10);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("plan");
  });

  it("redeems inside approval: discounted amount, used_count, one-per-tenant", () => {
    const couponId = insertCoupon({ max_uses: 5 });
    const result = checkout("SAVE20");
    expect(result.amount).toBeGreaterThan(8);
    expect(result.amount).toBeLessThan(9);
    expect(result.discount_applied).toBe(2);

    submitTxid(TENANT, result.request_id, VALID_TRC20_TXID);
    approveCryptoPayment(result.request_id, { adminUserId: ADMIN });

    expect(db.select().from(coupons).all()[0].used_count).toBe(1);
    const redemption = db.select().from(couponRedemptions).all()[0];
    expect(redemption.coupon_id).toBe(couponId);
    expect(redemption.tenant_id).toBe(TENANT);

    // Second use by the same tenant blocked at validation.
    expect(validateCoupon("SAVE20", TENANT, PLAN, 10).reason).toContain("already used");
  });

  it("rolls back the whole approval if the coupon ran out (atomicity)", () => {
    insertCoupon({ max_uses: 1 });
    const result = checkout("SAVE20");
    submitTxid(TENANT, result.request_id, VALID_TRC20_TXID);

    // Coupon exhausted between checkout and approval.
    db.update(coupons).set({ used_count: 1 }).run();

    expect(() => approveCryptoPayment(result.request_id, { adminUserId: ADMIN })).toThrow(
      "no longer available",
    );
    // Transaction rolled back: no payment, no subscription, request still submitted.
    expect(db.select().from(payments).all()).toHaveLength(0);
    expect(db.select().from(subscriptions).all()).toHaveLength(0);
    expect(db.select().from(cryptoPaymentRequests).all()[0].status).toBe("submitted");
  });
});
