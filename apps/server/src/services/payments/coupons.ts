import { sqlite } from "../../db/index.js";

/**
 * Coupon validation and redemption. Validation is read-only and safe to call
 * from checkout; redemption runs INSIDE the payment-approval transaction with
 * a used_count guard so max_uses can never be oversubscribed.
 */

export interface CouponRow {
  id: string;
  code: string;
  discount_type: string;
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  plan_ids: string | null;
  is_active: number;
}

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  coupon?: CouponRow;
  discountedAmount?: number;
}

export function findCouponByCode(code: string): CouponRow | undefined {
  return sqlite
    .prepare(
      `SELECT id, code, discount_type, value, max_uses, used_count, expires_at, plan_ids, is_active
       FROM coupons WHERE code = ? LIMIT 1`,
    )
    .get(code.trim().toUpperCase()) as CouponRow | undefined;
}

export function discountedPrice(coupon: CouponRow, baseAmount: number): number {
  const discounted =
    coupon.discount_type === "percent"
      ? baseAmount * (1 - coupon.value / 100)
      : baseAmount - coupon.value;
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function validateCoupon(
  code: string,
  tenantId: string,
  planId: string,
  baseAmount: number,
): CouponValidation {
  const coupon = findCouponByCode(code);
  // Single generic reason: never reveal whether a code exists vs. is expired.
  const invalid: CouponValidation = { valid: false, reason: "Invalid or expired coupon" };

  if (!coupon || coupon.is_active !== 1) return invalid;
  if (coupon.expires_at && coupon.expires_at < new Date().toISOString()) return invalid;
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return invalid;

  if (coupon.plan_ids) {
    try {
      const planIds = JSON.parse(coupon.plan_ids) as string[];
      if (planIds.length > 0 && !planIds.includes(planId)) {
        return { valid: false, reason: "Coupon does not apply to this plan" };
      }
    } catch {
      return invalid;
    }
  }

  const alreadyRedeemed = sqlite
    .prepare(`SELECT 1 FROM coupon_redemptions WHERE coupon_id = ? AND tenant_id = ? LIMIT 1`)
    .get(coupon.id, tenantId);
  if (alreadyRedeemed) {
    return { valid: false, reason: "Coupon already used on this account" };
  }

  return { valid: true, coupon, discountedAmount: discountedPrice(coupon, baseAmount) };
}

/**
 * Records the redemption. MUST be called inside the payment-approval
 * transaction. Throws when the coupon ran out between checkout and approval.
 */
export function redeemCouponInTx(
  couponId: string,
  tenantId: string,
  amountDiscounted: number,
  refs: { paymentId?: string; cryptoRequestId?: string },
): void {
  const claimed = sqlite
    .prepare(
      `UPDATE coupons SET used_count = used_count + 1, updated_at = ?
       WHERE id = ? AND is_active = 1 AND (max_uses IS NULL OR used_count < max_uses)`,
    )
    .run(new Date().toISOString(), couponId);
  if (claimed.changes === 0) {
    throw new Error("Coupon is no longer available");
  }
  sqlite
    .prepare(
      `INSERT INTO coupon_redemptions
         (id, coupon_id, tenant_id, amount_discounted, payment_id, crypto_request_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      couponId,
      tenantId,
      amountDiscounted,
      refs.paymentId ?? null,
      refs.cryptoRequestId ?? null,
    );
}
