import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { dbGet, dbRun } from "../../db/raw.js";

/**
 * WooCommerce order webhook — POST /api/webhooks/woocommerce?tenant_id=...
 * Machine caller (no user session). Fail-closed: the tenant must have an ACTIVE
 * woocommerce_integrations row. If a webhook secret is stored in the
 * integration's settings.webhook_secret, the X-WC-Webhook-Signature HMAC is
 * verified; otherwise the request is accepted (Woo's signature is optional and
 * configured manually by the merchant).
 */

export const woocommerceWebhookRoute = new Hono();

interface WooOrder {
  id: number;
  number?: string;
  status?: string;
  total?: string;
  date_paid?: string | null;
  billing?: { first_name?: string; last_name?: string; phone?: string; email?: string };
}

function mapStatus(woo: string | undefined): string {
  switch (woo) {
    case "completed":
      return "delivered";
    case "processing":
      return "confirmed";
    case "cancelled":
    case "refunded":
    case "failed":
      return "cancelled";
    default:
      return "pending";
  }
}

woocommerceWebhookRoute.post("/", async (c) => {
  const tenantId = c.req.query("tenant_id");
  if (!tenantId) return c.json({ error: "tenant_id required" }, 400);

  const integration = (await dbGet(
    "SELECT id, settings FROM woocommerce_integrations WHERE tenant_id = ? AND is_active = true LIMIT 1",
    tenantId,
  )) as { id: string; settings: string | null } | undefined;
  if (!integration) return c.json({ error: "No active WooCommerce integration" }, 404);

  const raw = await c.req.text();

  // Fail-closed HMAC verification. The integration always has a webhook_secret
  // (auto-generated at save). A missing secret or a missing/invalid signature is
  // rejected — we NEVER trust the tenant_id query string alone.
  let webhookSecret: string | undefined;
  try {
    const s = integration.settings
      ? typeof integration.settings === "string"
        ? JSON.parse(integration.settings)
        : integration.settings
      : undefined;
    webhookSecret = s?.webhook_secret;
  } catch {
    webhookSecret = undefined;
  }
  if (!webhookSecret) return c.json({ error: "Webhook secret not configured" }, 401);
  const sig = c.req.header("x-wc-webhook-signature");
  if (!sig) return c.json({ error: "Missing signature" }, 401);
  const expected = createHmac("sha256", webhookSecret).update(raw).digest("base64");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let order: WooOrder;
  try {
    order = JSON.parse(raw) as WooOrder;
  } catch {
    return c.json({ error: "Invalid payload" }, 400);
  }
  if (!order?.id) return c.json({ ok: true, skipped: "no order id" });

  const name = [order.billing?.first_name, order.billing?.last_name].filter(Boolean).join(" ") || null;
  const total = parseFloat(order.total ?? "0") || 0;
  const status = mapStatus(order.status);
  const paymentStatus = order.date_paid ? "paid" : "unpaid";
  const orderNumber = order.number ?? String(order.id);
  const now = new Date().toISOString();

  const existing = (await dbGet(
    "SELECT id FROM orders WHERE tenant_id = ? AND woo_order_id = ? LIMIT 1",
    tenantId,
    order.id,
  )) as { id: string } | undefined;

  if (existing) {
    await dbRun(
      "UPDATE orders SET status=?, payment_status=?, total=?, customer_name=COALESCE(?,customer_name), customer_phone=COALESCE(?,customer_phone), updated_at=? WHERE id=?",
      status,
      paymentStatus,
      total,
      name,
      order.billing?.phone ?? null,
      now,
      existing.id,
    );
  } else {
    await dbRun(
      `INSERT INTO orders (id, tenant_id, woo_order_id, order_number, customer_name, customer_phone, total, subtotal, status, payment_status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'woocommerce')`,
      crypto.randomUUID(),
      tenantId,
      order.id,
      orderNumber,
      name,
      order.billing?.phone ?? null,
      total,
      total,
      status,
      paymentStatus,
    );
  }
  return c.json({ ok: true });
});
