import { sqlite } from "../db/index.js";
import {
  createCryptoCheckout,
  submitTxid,
  type CryptoNetwork,
} from "../services/payments/crypto.js";
import { validateCoupon } from "../services/payments/coupons.js";
import type { FnContext, FnResult } from "./waha/session.js";

/** Crypto checkout + coupon fn handlers, spread into the /api/fn registry. */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

function fail(message: string): FnResult {
  return { data: null, error: { message } };
}

export const BILLING_HANDLERS: Record<string, FnHandler> = {
  "crypto-checkout-create": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const planId = typeof body.plan_id === "string" ? body.plan_id : "";
    const network = typeof body.network === "string" ? body.network : "";
    const couponCode = typeof body.coupon_code === "string" ? body.coupon_code : undefined;
    if (!planId) return fail("plan_id is required");
    try {
      const checkout = createCryptoCheckout(
        ctx.tenantId,
        planId,
        network as CryptoNetwork,
        couponCode,
      );
      return { data: checkout, error: null };
    } catch (err) {
      return fail(err instanceof Error ? err.message : "checkout failed");
    }
  },

  "crypto-submit-txid": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const requestId = typeof body.request_id === "string" ? body.request_id : "";
    const txid = typeof body.txid === "string" ? body.txid : "";
    if (!requestId || !txid) return fail("request_id and txid are required");
    try {
      submitTxid(ctx.tenantId, requestId, txid);
      return { data: { success: true, status: "submitted" }, error: null };
    } catch (err) {
      return fail(err instanceof Error ? err.message : "submission failed");
    }
  },

  "coupon-validate": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const code = typeof body.code === "string" ? body.code : "";
    const planId = typeof body.plan_id === "string" ? body.plan_id : "";
    if (!code || !planId) return fail("code and plan_id are required");
    const plan = sqlite
      .prepare(`SELECT price_monthly FROM plans WHERE id = ? AND is_active = 1 LIMIT 1`)
      .get(planId) as { price_monthly: number } | undefined;
    if (!plan) return fail("Plan not found");
    const validation = validateCoupon(code, ctx.tenantId, planId, plan.price_monthly);
    if (!validation.valid) {
      return { data: { valid: false, reason: validation.reason }, error: null };
    }
    return {
      data: {
        valid: true,
        base_amount: plan.price_monthly,
        discounted_amount: validation.discountedAmount,
      },
      error: null,
    };
  },
};
