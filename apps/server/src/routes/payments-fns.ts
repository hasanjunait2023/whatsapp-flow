import { dbGet, dbRun, dbTx } from "../db/raw.js";
import { emitChange } from "../realtime/emitter.js";
import { UDDOKTAPAY_API_KEY, UDDOKTAPAY_BASE_URL, AUTH_BASE_URL } from "../lib/env.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Payments module — UddoktaPay (BDT gateway) checkout + verification, plus the
 * post-payment provisioning trigger. Ported from supabase/functions/
 * uddoktapay-checkout, uddoktapay-verify, payment-confirmed.
 *
 * Response contracts preserved verbatim for the web hooks (useUddoktaPay,
 * useAdminPayments): checkout returns { success, payment_url, order_id,
 * invoice_id, subscription_order_id }; verify returns { success, status,
 * payment_status, amount, transaction_id, payment_method }.
 *
 * Secrets stay server-side: the gateway key is read from env, never the client.
 * Writes go through the db directly (subscription_orders / payments are
 * readonly via /api/query).
 */

const ok = (data: unknown): FnResult => ({ data, error: null });

interface CheckoutBody {
  tenant_id?: string;
  plan_id?: string;
  amount?: number;
  billing_cycle?: "monthly" | "yearly";
  order_type?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
}

function gatewayBase(): string {
  return UDDOKTAPAY_BASE_URL.replace(/\/api\/?$/, "");
}

/** uddoktapay-checkout: create gateway invoice + pending order/payment rows. */
export async function uddoktapayCheckout(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as CheckoutBody;
  if (!UDDOKTAPAY_API_KEY || !UDDOKTAPAY_BASE_URL) {
    return ok({ success: false, error: "UddoktaPay configuration missing" });
  }
  const tenantId = body.tenant_id ?? ctx.tenantId ?? undefined;
  if (!tenantId || !body.plan_id || !body.amount || !body.customer_name || !body.customer_email) {
    return ok({ success: false, error: "Missing required fields" });
  }
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) {
    return ok({ success: false, error: "Forbidden tenant" });
  }

  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const orderNumber = `SUB-${Date.now().toString(36).toUpperCase()}`;
  const subscriptionOrderId = crypto.randomUUID();

  await dbRun(
    `INSERT INTO subscription_orders
         (id, tenant_id, plan_id, order_number, amount, billing_cycle, status,
          payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 'uddoktapay', ?)`,
    subscriptionOrderId,
    tenantId,
    body.plan_id,
    orderNumber,
    body.amount,
    body.billing_cycle ?? "monthly",
    `Order ID: ${orderId}, Type: ${body.order_type ?? "subscription"}`,
  );

  const checkoutPayload = {
    full_name: body.customer_name,
    email: body.customer_email,
    amount: String(body.amount),
    // UddoktaPay checkout-v2 requires return URLs. On success it redirects to
    // redirect_url?invoice_id=... which PaymentSuccess reads to call verify.
    redirect_url: `${AUTH_BASE_URL}/billing/payment-success`,
    cancel_url: `${AUTH_BASE_URL}/billing/payment-cancelled`,
    metadata: {
      order_id: orderId,
      subscription_order_id: subscriptionOrderId,
      tenant_id: tenantId,
      plan_id: body.plan_id,
      billing_cycle: body.billing_cycle ?? "monthly",
      order_type: body.order_type ?? "subscription",
    },
  };

  let gatewayData: { payment_url?: string; invoice_id?: string; message?: string } = {};
  try {
    const res = await fetch(`${gatewayBase()}/api/checkout-v2`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify(checkoutPayload),
    });
    gatewayData = (await res.json()) as typeof gatewayData;
    if (!res.ok || !gatewayData.payment_url) {
      await dbRun(
        "UPDATE subscription_orders SET status = 'failed', notes = ? WHERE id = ?",
        `Gateway error: ${JSON.stringify(gatewayData)}`,
        subscriptionOrderId,
      );
      return ok({ success: false, error: gatewayData.message ?? "Failed to create payment" });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gateway request failed";
    await dbRun(
      "UPDATE subscription_orders SET status = 'failed', notes = ? WHERE id = ?",
      `Gateway error: ${message}`,
      subscriptionOrderId,
    );
    return ok({ success: false, error: message });
  }

  await dbRun(
    `INSERT INTO payments
         (id, tenant_id, subscription_id, amount, currency, payment_method,
          payment_gateway, uddoktapay_invoice_id, status, notes, gateway_response)
       VALUES (?, ?, ?, ?, 'BDT', 'uddoktapay', 'uddoktapay', ?, 'pending', ?, ?)`,
    crypto.randomUUID(),
    tenantId,
    subscriptionOrderId,
    body.amount,
    gatewayData.invoice_id ?? null,
    `Order: ${orderId}`,
    JSON.stringify(gatewayData),
  );
  emitChange("payments", tenantId, {});

  return ok({
    success: true,
    payment_url: gatewayData.payment_url,
    order_id: orderId,
    invoice_id: gatewayData.invoice_id,
    subscription_order_id: subscriptionOrderId,
  });
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  amount: number;
  status: string;
  notes: string | null;
}

/** uddoktapay-verify: confirm payment with the gateway, mark verified, mark order paid. */
export async function uddoktapayVerify(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!UDDOKTAPAY_API_KEY || !UDDOKTAPAY_BASE_URL) {
    return ok({ success: false, error: "UddoktaPay configuration missing" });
  }
  const invoiceId = raw.invoice_id as string | undefined;
  if (!invoiceId) return ok({ success: false, error: "Invoice ID required" });

  // Resolve + authorize the local payment BEFORE calling the gateway, so a
  // tenant can't trigger verification calls for invoice_ids they don't own.
  const payment = (await dbGet(
    "SELECT id, tenant_id, subscription_id, amount, status, notes FROM payments WHERE uddoktapay_invoice_id = ? LIMIT 1",
    invoiceId,
  )) as PaymentRow | undefined;
  if (!payment) {
    return ok({ success: false, error: "Payment record not found" });
  }
  if (!ctx.isAdmin && payment.tenant_id !== ctx.tenantId) {
    return ok({ success: false, error: "Forbidden tenant" });
  }

  if (payment.status === "verified") {
    return ok({ success: true, message: "Payment already verified", status: "verified", amount: payment.amount });
  }

  let verifyData: {
    status?: string;
    transaction_id?: string;
    sender_number?: string;
    payment_method?: string;
    message?: string;
  } = {};
  try {
    const res = await fetch(`${gatewayBase()}/api/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "RT-UDDOKTAPAY-API-KEY": UDDOKTAPAY_API_KEY,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    verifyData = (await res.json()) as typeof verifyData;
    if (!res.ok) {
      return ok({ success: false, error: verifyData.message ?? "Verification failed" });
    }
  } catch (err) {
    return ok({ success: false, error: err instanceof Error ? err.message : "Verification failed" });
  }

  const isCompleted = verifyData.status === "COMPLETED";
  const txId = verifyData.transaction_id ?? verifyData.sender_number ?? null;

  // Both updates (payments + subscription_orders) must succeed atomically.
  // A crash between them previously left the payment 'verified' but the
  // subscription order 'pending'. Wrap in a single tx.
  await dbTx(async (tx) => {
    await tx.run(
      `UPDATE payments
           SET status = ?, verified_at = ?, transaction_id = ?, gateway_response = ?, notes = ?
         WHERE id = ?`,
      isCompleted ? "verified" : "pending",
      isCompleted ? new Date().toISOString() : null,
      txId,
      JSON.stringify(verifyData),
      `${payment.notes ?? ""} | Gateway: ${verifyData.payment_method ?? "unknown"} | Status: ${verifyData.status}`,
      payment.id,
    );

    if (isCompleted && payment.subscription_id) {
      await tx.run(
        "UPDATE subscription_orders SET status = 'paid', verified_at = ?, transaction_id = ? WHERE id = ?",
        new Date().toISOString(),
        verifyData.transaction_id ?? null,
        payment.subscription_id,
      );
    }
  });
  emitChange("payments", payment.tenant_id, {});

  return ok({
    success: true,
    status: isCompleted ? "verified" : "pending",
    payment_status: verifyData.status,
    amount: payment.amount,
    transaction_id: verifyData.transaction_id,
    payment_method: verifyData.payment_method,
  });
}

/**
 * payment-confirmed: post-payment hook. Validates the payment is verified and
 * the subscription is active, then records an onboarding job so the tenant can
 * provision a WhatsApp session. Idempotent on an already-active instance.
 */
export async function paymentConfirmed(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const tenantId = (raw.tenant_id as string) ?? ctx.tenantId ?? undefined;
  const paymentId = raw.payment_id as string | undefined;
  if (!tenantId) return ok({ error: "tenant_id is required" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ error: "Forbidden tenant" });

  if (paymentId) {
    // Scope the payment lookup to the resolved tenant so a verified payment id
    // from another tenant cannot be used to trigger provisioning here.
    const payment = (await dbGet(
      "SELECT status FROM payments WHERE id = ? AND tenant_id = ? LIMIT 1",
      paymentId,
      tenantId,
    )) as { status: string } | undefined;
    if (!payment || payment.status !== "verified") {
      return ok({ error: "Payment not verified" });
    }
  }

  const sub = (await dbGet(
    "SELECT status FROM subscriptions WHERE tenant_id = ? LIMIT 1",
    tenantId,
  )) as { status: string } | undefined;
  if (!sub) return ok({ error: "Subscription not found" });
  if (sub.status === "suspended" || sub.status === "cancelled") {
    return ok({ error: "Subscription is not active", code: "SUBSCRIPTION_INACTIVE" });
  }

  const existing = (await dbGet(
    "SELECT id, status FROM whatsapp_instances WHERE tenant_id = ? AND (is_deleted IS NOT TRUE) ORDER BY is_default DESC LIMIT 1",
    tenantId,
  )) as { id: string; status: string } | undefined;
  if (existing && existing.status === "active") {
    return ok({ message: "Instance already exists and is active", instance_id: existing.id, reused: true });
  }

  const jobId = crypto.randomUUID();
  await dbRun(
    "INSERT INTO onboarding_jobs (id, tenant_id, instance_id, status, step) VALUES (?, ?, ?, 'pending', 'awaiting_provision')",
    jobId,
    tenantId,
    existing?.id ?? null,
  );
  emitChange("onboarding_jobs", tenantId, { id: jobId });

  return ok({ message: "Onboarding queued", job_id: jobId, instance_id: existing?.id ?? null });
}

export const PAYMENTS_HANDLERS = {
  "uddoktapay-checkout": uddoktapayCheckout,
  "uddoktapay-verify": uddoktapayVerify,
  "payment-confirmed": paymentConfirmed,
};
