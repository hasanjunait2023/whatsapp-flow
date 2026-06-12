import { randomInt } from "node:crypto";
import { sqlite } from "../../db/index.js";
import { emitChange } from "../../realtime/emitter.js";
import { CRYPTO_USDT_ADDRESS_TRC20, CRYPTO_USDT_ADDRESS_BEP20 } from "../../lib/env.js";
import { validateCoupon, redeemCouponInTx } from "./coupons.js";

/**
 * Manual USDT transfer checkout:
 *   create (salted unique amount, 24h expiry) -> customer pays exact amount ->
 *   submit txid (format-validated, globally unique) -> admin approve in ONE
 *   transaction (subscription extend + payments row + coupon redemption).
 */

const REQUEST_TTL_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_PERIOD_DAYS = 30;
const SALT_ATTEMPTS = 100;

const TXID_FORMAT: Record<string, RegExp> = {
  TRC20: /^[0-9a-fA-F]{64}$/,
  BEP20: /^0x[0-9a-fA-F]{64}$/,
};

export type CryptoNetwork = "TRC20" | "BEP20";

function walletFor(network: CryptoNetwork): string {
  const address = network === "TRC20" ? CRYPTO_USDT_ADDRESS_TRC20 : CRYPTO_USDT_ADDRESS_BEP20;
  if (!address) {
    throw new Error(`${network} payments are not configured`);
  }
  return address;
}

interface PlanRow {
  id: string;
  name: string;
  price_monthly: number;
}

function getPlan(planId: string): PlanRow {
  const plan = sqlite
    .prepare(`SELECT id, name, price_monthly FROM plans WHERE id = ? AND is_active = 1 LIMIT 1`)
    .get(planId) as PlanRow | undefined;
  if (!plan) throw new Error("Plan not found");
  return plan;
}

/**
 * Picks amount + random cent salt not used by another live request, so the
 * exact on-chain amount identifies the payer.
 */
function saltedAmount(baseAmount: number): number {
  for (let i = 0; i < SALT_ATTEMPTS; i++) {
    const salt = randomInt(1, 100); // 0.01 .. 0.99 (CSPRNG — not predictable)
    const candidate = Math.round(baseAmount * 100 + salt) / 100;
    const clash = sqlite
      .prepare(
        `SELECT 1 FROM crypto_payment_requests
         WHERE unique_amount = ? AND status IN ('awaiting_payment','submitted') LIMIT 1`,
      )
      .get(candidate);
    if (!clash) return candidate;
  }
  throw new Error("Could not allocate a unique payment amount; try again");
}

export interface CheckoutResult {
  request_id: string;
  wallet_address: string;
  network: CryptoNetwork;
  currency: string;
  amount: number;
  base_amount: number;
  discount_applied: number;
  expires_at: string;
}

export function createCryptoCheckout(
  tenantId: string,
  planId: string,
  network: CryptoNetwork,
  couponCode?: string,
): CheckoutResult {
  if (network !== "TRC20" && network !== "BEP20") {
    throw new Error("network must be TRC20 or BEP20");
  }
  const wallet = walletFor(network);
  const plan = getPlan(planId);

  let baseAmount = plan.price_monthly;
  let couponId: string | null = null;
  if (couponCode) {
    const validation = validateCoupon(couponCode, tenantId, planId, baseAmount);
    if (!validation.valid || !validation.coupon) {
      throw new Error(validation.reason ?? "Invalid coupon");
    }
    couponId = validation.coupon.id;
    baseAmount = validation.discountedAmount!;
  }

  // Supersede any previous live request for this tenant.
  sqlite
    .prepare(
      `UPDATE crypto_payment_requests SET status = 'expired'
       WHERE tenant_id = ? AND status = 'awaiting_payment'`,
    )
    .run(tenantId);

  const amount = saltedAmount(baseAmount);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS).toISOString();
  sqlite
    .prepare(
      `INSERT INTO crypto_payment_requests
         (id, tenant_id, plan_id, coupon_id, network, wallet_address, amount_usd, unique_amount, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, tenantId, planId, couponId, network, wallet, plan.price_monthly, amount, expiresAt);

  return {
    request_id: id,
    wallet_address: wallet,
    network,
    currency: "USDT",
    amount,
    base_amount: plan.price_monthly,
    discount_applied: Math.round((plan.price_monthly - baseAmount) * 100) / 100,
    expires_at: expiresAt,
  };
}

export function submitTxid(tenantId: string, requestId: string, txid: string): void {
  const request = sqlite
    .prepare(
      `SELECT id, network, status, expires_at FROM crypto_payment_requests
       WHERE id = ? AND tenant_id = ? LIMIT 1`,
    )
    .get(requestId, tenantId) as
    | { id: string; network: string; status: string; expires_at: string }
    | undefined;

  if (!request) throw new Error("Payment request not found");
  if (request.status !== "awaiting_payment") {
    throw new Error(`Request is ${request.status}, txid cannot be submitted`);
  }
  if (request.expires_at < new Date().toISOString()) {
    sqlite
      .prepare(`UPDATE crypto_payment_requests SET status = 'expired' WHERE id = ?`)
      .run(request.id);
    throw new Error("Payment request expired — create a new one");
  }

  const normalized = txid.trim();
  const format = TXID_FORMAT[request.network];
  if (!format || !format.test(normalized)) {
    throw new Error(`Invalid ${request.network} transaction id format`);
  }

  try {
    sqlite
      .prepare(
        `UPDATE crypto_payment_requests SET txid = ?, status = 'submitted', submitted_at = ? WHERE id = ?`,
      )
      .run(normalized, new Date().toISOString(), request.id);
  } catch (err) {
    if (err instanceof Error && /UNIQUE/i.test(err.message)) {
      throw new Error("This transaction id has already been used");
    }
    throw err;
  }

  // Alert admins via the notifications feed.
  sqlite
    .prepare(
      `INSERT INTO notifications (id, tenant_id, channel, type, status, metadata)
       VALUES (?, ?, 'in_app', 'crypto_payment_submitted', 'pending', ?)`,
    )
    .run(
      crypto.randomUUID(),
      tenantId,
      JSON.stringify({ request_id: request.id, txid: normalized }),
    );
  emitChange("crypto_payment_requests", tenantId, { id: request.id, status: "submitted" });
}

export interface ReviewContext {
  adminUserId: string;
  note?: string;
}

/** Admin approval — one transaction: re-check -> subscription -> payment -> coupon. */
export function approveCryptoPayment(requestId: string, review: ReviewContext): void {
  const tx = sqlite.transaction(() => {
    const request = sqlite
      .prepare(
        `SELECT id, tenant_id, plan_id, coupon_id, unique_amount, amount_usd, txid, status
         FROM crypto_payment_requests WHERE id = ? LIMIT 1`,
      )
      .get(requestId) as
      | {
          id: string;
          tenant_id: string;
          plan_id: string;
          coupon_id: string | null;
          unique_amount: number;
          amount_usd: number;
          txid: string | null;
          status: string;
        }
      | undefined;

    if (!request) throw new Error("Payment request not found");
    if (request.status !== "submitted") {
      throw new Error(`Request is ${request.status}, not submitted`);
    }

    const now = new Date().toISOString();

    // Extend (or create) the subscription: period continues from the later of
    // now and the current period end, so early renewals don't lose time.
    const sub = sqlite
      .prepare(`SELECT id, current_period_end FROM subscriptions WHERE tenant_id = ? LIMIT 1`)
      .get(request.tenant_id) as { id: string; current_period_end: string } | undefined;
    const baseTime = sub && sub.current_period_end > now ? new Date(sub.current_period_end) : new Date();
    const newPeriodEnd = new Date(
      baseTime.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    let subscriptionId: string;
    if (sub) {
      subscriptionId = sub.id;
      sqlite
        .prepare(
          `UPDATE subscriptions SET plan_id = ?, status = 'active', current_period_end = ?,
             grace_period_ends_at = NULL, cancelled_at = NULL, updated_at = ? WHERE id = ?`,
        )
        .run(request.plan_id, newPeriodEnd, now, sub.id);
    } else {
      subscriptionId = crypto.randomUUID();
      sqlite
        .prepare(
          `INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end)
           VALUES (?, ?, ?, 'active', ?, ?)`,
        )
        .run(subscriptionId, request.tenant_id, request.plan_id, now, newPeriodEnd);
    }

    const paymentId = crypto.randomUUID();
    sqlite
      .prepare(
        `INSERT INTO payments
           (id, tenant_id, subscription_id, amount, currency, payment_method, payment_gateway,
            transaction_id, status, verified_by, verified_at, notes)
         VALUES (?, ?, ?, ?, 'USDT', 'crypto_usdt', 'manual_crypto', ?, 'verified', ?, ?, ?)`,
      )
      .run(
        paymentId,
        request.tenant_id,
        subscriptionId,
        request.unique_amount,
        request.txid,
        review.adminUserId,
        now,
        review.note ?? null,
      );

    if (request.coupon_id) {
      const discounted = Math.round((request.amount_usd - request.unique_amount) * 100) / 100;
      redeemCouponInTx(request.coupon_id, request.tenant_id, Math.max(0, discounted), {
        paymentId,
        cryptoRequestId: request.id,
      });
    }

    sqlite
      .prepare(
        `UPDATE crypto_payment_requests SET status = 'approved', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?`,
      )
      .run(review.adminUserId, now, review.note ?? null, request.id);

    return request.tenant_id;
  });

  const tenantId = tx() as unknown as string;
  emitChange("crypto_payment_requests", tenantId, { id: requestId, status: "approved" });
  emitChange("subscriptions", tenantId, {});
}

export function rejectCryptoPayment(requestId: string, review: ReviewContext): void {
  const request = sqlite
    .prepare(`SELECT id, tenant_id, status FROM crypto_payment_requests WHERE id = ? LIMIT 1`)
    .get(requestId) as { id: string; tenant_id: string; status: string } | undefined;
  if (!request) throw new Error("Payment request not found");
  if (request.status !== "submitted") {
    throw new Error(`Request is ${request.status}, not submitted`);
  }
  sqlite
    .prepare(
      `UPDATE crypto_payment_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?`,
    )
    .run(review.adminUserId, new Date().toISOString(), review.note ?? null, request.id);
  emitChange("crypto_payment_requests", request.tenant_id, {
    id: request.id,
    status: "rejected",
  });
}
