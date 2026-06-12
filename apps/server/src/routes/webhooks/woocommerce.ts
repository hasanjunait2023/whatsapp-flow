import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sqlite } from "../../db/index.js";

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

  const integration = sqlite
    .prepare("SELECT id, settings FROM woocommerce_integrations WHERE tenant_id = ? AND is_active = 1 LIMIT 1")
    .get(tenantId) as { id: string; settings: string | null } | undefined;
  if (!integration) return c.json({ error: "No active WooCommerce integration" }, 404);

  const raw = await c.req.text();

  // Optional HMAC verification when a webhook secret is configured.
  let webhookSecret: string | undefined;
  try {
    webhookSecret = integration.settings ? JSON.parse(integration.settings)?.webhook_secret : undefined;
  } catch {
    webhookSecret = undefined;
  }
  if (webhookSecret) {
    const sig = c.req.header("x-wc-webhook-signature") ?? "";
    const expected = createHmac("sha256", webhookSecret).update(raw).digest("base64");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: "Invalid signature" }, 401);
    }
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

  const existing = sqlite
    .prepare("SELECT id FROM orders WHERE tenant_id = ? AND woo_order_id = ? LIMIT 1")
    .get(tenantId, order.id) as { id: string } | undefined;

  if (existing) {
    sqlite
      .prepare("UPDATE orders SET status=?, payment_status=?, total=?, customer_name=COALESCE(?,customer_name), customer_phone=COALESCE(?,customer_phone), updated_at=? WHERE id=?")
      .run(status, paymentStatus, total, name, order.billing?.phone ?? null, now, existing.id);
  } else {
    sqlite
      .prepare(
        `INSERT INTO orders (id, tenant_id, woo_order_id, order_number, customer_name, customer_phone, total, subtotal, status, payment_status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'woocommerce')`,
      )
      .run(crypto.randomUUID(), tenantId, order.id, orderNumber, name, order.billing?.phone ?? null, total, total, status, paymentStatus);
  }
  return c.json({ ok: true });
});
