import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { dbGet, dbRun, dbTx } from "../../db/raw.js";
import { auth } from "../../auth/index.js";
import { generateTempPassword } from "../../auth/password.js";
import { notify } from "../../services/notify.js";
import { logger } from "../../lib/logger.js";

/**
 * External sales webhook — POST /api/sales/webhook
 * Machine caller (no user session). Creates tenant + user + subscription for
 * orders placed on the main marketing website or by admins via the panel.
 * Auth: X-Sales-Webhook-Secret header compared against system_settings row.
 */

export const salesWebhookRoute = new Hono();

// Cache the static webhook secret — it never changes at runtime.
let _salesSecretCache: { value: string; exp: number } | null = null;
const SALES_SECRET_TTL = 5 * 60 * 1000;

async function getSalesWebhookSecret(): Promise<string | undefined> {
  const now = Date.now();
  if (_salesSecretCache && _salesSecretCache.exp > now) return _salesSecretCache.value;
  const row = (await dbGet(
    "SELECT value FROM system_settings WHERE key = 'sales_webhook_secret' LIMIT 1",
  )) as { value: string | null } | undefined;
  const rawValue = row?.value;
  let secret: string | undefined;
  try {
    if (rawValue && typeof rawValue === "object" && "value" in (rawValue as object)) {
      secret = (rawValue as { value: string }).value;
    } else if (typeof rawValue === "string") {
      const parsed = JSON.parse(rawValue) as unknown;
      secret =
        typeof parsed === "object" && parsed !== null && "value" in parsed
          ? (parsed as { value: string }).value
          : (parsed as string);
    }
  } catch {
    secret = typeof rawValue === "string" ? rawValue : undefined;
  }
  if (secret) _salesSecretCache = { value: secret, exp: now + SALES_SECRET_TTL };
  return secret;
}

interface SalesWebhookBody {
  customer: { name: string; email: string; phone?: string | null };
  order: {
    order_id: string;
    plan_slug: string;
    billing_cycle?: string;
    amount?: number;
    payment_method?: string | null;
    transaction_id?: string | null;
  };
  business: { name: string; type: string };
  source?: string;
}

salesWebhookRoute.post("/", async (c) => {
  // --- auth: timing-safe secret compare ---
  const headerSecret = c.req.header("X-Sales-Webhook-Secret");
  if (!headerSecret) return c.json({ error: "Missing X-Sales-Webhook-Secret header" }, 401);

  const storedSecret = await getSalesWebhookSecret();
  if (!storedSecret) return c.json({ error: "Webhook secret not configured" }, 503);

  try {
    const a = Buffer.from(headerSecret, "utf8");
    const b = Buffer.from(storedSecret, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return c.json({ error: "Invalid webhook secret" }, 401);
    }
  } catch {
    return c.json({ error: "Invalid webhook secret" }, 401);
  }

  // --- parse body ---
  let body: SalesWebhookBody;
  try {
    body = (await c.req.json()) as SalesWebhookBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { customer, order, business, source = "external" } = body;
  if (!customer?.email || !customer?.name || !order?.order_id || !order?.plan_slug || !business?.name || !business?.type) {
    return c.json({ error: "Missing required fields: customer.email, customer.name, order.order_id, order.plan_slug, business.name, business.type" }, 400);
  }

  const externalOrderId = order.order_id;
  const email = customer.email.toLowerCase().trim();

  // --- parallel: idempotency + biz-type + user lookup have no data dependencies ---
  const [existing, bizType, existingUser] = (await Promise.all([
    dbGet(
      "SELECT id, tenant_id, user_id, status FROM external_sales_orders WHERE external_order_id = ? AND source = ? LIMIT 1",
      externalOrderId,
      source,
    ),
    dbGet("SELECT id, name FROM business_types WHERE slug = ? LIMIT 1", business.type),
    dbGet('SELECT id FROM "user" WHERE email = ? LIMIT 1', email),
  ])) as [
    { id: string; tenant_id: string | null; user_id: string | null; status: string } | undefined,
    { id: string; name: string } | undefined,
    { id: string } | undefined,
  ];

  if (existing?.status === "completed") {
    return c.json({ success: true, duplicate: true, tenant_id: existing.tenant_id, user_id: existing.user_id }, 200);
  }
  if (!bizType) return c.json({ error: `Unknown business type: ${business.type}` }, 400);

  // --- resolve plan by tier (plan lookup depends on bizType.id) ---
  // plan_slug format: "${tier}_${businessTypeSlug}" e.g. "starter_retail"
  const tierPart = order.plan_slug.split("_")[0];
  let plan = (await dbGet(
    "SELECT id, name FROM plans WHERE tier = ? AND business_type_id = ? AND is_active = true LIMIT 1",
    tierPart,
    bizType.id,
  )) as { id: string; name: string } | undefined;
  if (!plan) {
    // fallback: any active plan with this tier
    plan = (await dbGet(
      "SELECT id, name FROM plans WHERE tier = ? AND is_active = true LIMIT 1",
      tierPart,
    )) as { id: string; name: string } | undefined;
  }
  if (!plan) return c.json({ error: `No active plan found for tier: ${tierPart}` }, 400);

  let userId: string;
  let tempPassword: string | undefined;
  let userAlreadyExisted = false;

  if (existingUser) {
    userId = existingUser.id;
    userAlreadyExisted = true;
  } else {
    tempPassword = generateTempPassword();
    try {
      const result = await auth.api.signUpEmail({
        body: { email, password: tempPassword, name: customer.name },
      });
      userId = result.user.id;
    } catch (err) {
      logger.error("sales_webhook_signup_failed", { email, err: String(err) });
      // Update order record to failed if it exists
      if (existing) {
        await dbRun(
          "UPDATE external_sales_orders SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
          `User creation failed: ${String(err)}`,
          new Date().toISOString(),
          existing.id,
        );
      }
      return c.json({ error: "Failed to create user account" }, 500);
    }
  }

  // --- create tenant ---
  const tenantId = crypto.randomUUID();
  const now = new Date().toISOString();
  const billingCycle = order.billing_cycle ?? "monthly";
  const tenantSlug = business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) + "-" + tenantId.slice(0, 6);

  // ponytail: single transaction — partial provisioning (tenant+role but no sub) is a correctness hazard
  const periodEnd = new Date();
  if (billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  try {
    await dbTx(async (tx) => {
      await tx.run(
        `INSERT INTO tenants (id, name, owner_id, business_type_id, is_activated, activated_at, slug, created_at, updated_at)
         VALUES (?, ?, ?, ?, true, ?, ?, ?, ?)`,
        tenantId,
        business.name,
        userId,
        bizType.id,
        now,
        tenantSlug,
        now,
        now,
      );
      await tx.run(
        `INSERT INTO user_roles (id, user_id, tenant_id, role, created_at, updated_at)
         VALUES (?, ?, ?, 'owner', ?, ?)`,
        crypto.randomUUID(),
        userId,
        tenantId,
        now,
        now,
      );
      await tx.run(
        `INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?)`,
        crypto.randomUUID(),
        tenantId,
        plan.id,
        now,
        periodEnd.toISOString(),
        now,
      );
    });
  } catch (err) {
    logger.error("sales_webhook_provisioning_failed", { tenantId, userId, err: String(err) });
    if (existing) {
      await dbRun(
        "UPDATE external_sales_orders SET status = 'failed', error_message = ?, updated_at = ? WHERE id = ?",
        `Provisioning failed: ${String(err)}`,
        now,
        existing.id,
      );
    }
    return c.json({ error: "Failed to provision tenant" }, 500);
  }

  // --- record / update external_sales_orders ---
  if (existing) {
    await dbRun(
      `UPDATE external_sales_orders
       SET status = 'completed', tenant_id = ?, user_id = ?, plan_id = ?,
           processed_at = ?, updated_at = ?, error_message = null
       WHERE id = ?`,
      tenantId,
      userId,
      plan.id,
      now,
      now,
      existing.id,
    );
  } else {
    await dbRun(
      `INSERT INTO external_sales_orders
         (id, external_order_id, source, customer_name, customer_email, customer_phone,
          business_name, business_type, plan_id, amount, currency, billing_cycle,
          payment_method, transaction_id, status, tenant_id, user_id, processed_at,
          raw_payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BDT', ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      externalOrderId,
      source,
      customer.name,
      email,
      customer.phone ?? null,
      business.name,
      business.type,
      plan.id,
      order.amount ?? 0,
      billingCycle,
      order.payment_method ?? "manual",
      order.transaction_id ?? null,
      tenantId,
      userId,
      now,
      JSON.stringify(body),
      now,
      now,
    );
  }

  // --- welcome notification (fire-and-forget) ---
  void notify({
    tenantId,
    userId,
    type: "welcome",
    title: "Welcome to Ecomex!",
    body: `Your account is ready. Email: ${email}${tempPassword ? ` | Temp password: ${tempPassword}` : ""}. Visit Settings to change your password.`,
    url: "/settings",
  });

  logger.info("sales_webhook_processed", {
    external_order_id: externalOrderId,
    tenant_id: tenantId,
    user_id: userId,
    user_created: !userAlreadyExisted,
    plan: plan.name,
  });

  return c.json({
    success: true,
    tenant_id: tenantId,
    user_id: userId,
    temp_password: tempPassword ?? null,
    user_already_existed: userAlreadyExisted,
    plan: plan.name,
  });
});
