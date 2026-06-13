import { dbGet, dbAll, dbRun } from "../db/raw.js";
import { notify } from "../services/notify.js";
import { fbRefreshProfile } from "./fb-fns.js";
import { generateTempPassword } from "../auth/password.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Onboarding + diagnostics handlers, wired into POST /api/fn/:name.
 *
 * The Supabase originals delivered welcome credentials over Gmail/Wasender and
 * pinged a hardcoded admin Telegram chat. v1 has no email transport and no
 * platform-admin chat, so welcome/notification flows are delivered as in-app
 * notifications through the shared notify() entry point (matching every other
 * server notification). Error reports land as an admin_notification + a support
 * ticket. No credentials are returned in generic responses beyond the temp
 * password the admin explicitly rotated.
 *
 * Ported from: send-welcome-email, test-welcome-message,
 * admin-test-welcome-message, resend-welcome-notification, report-system-error,
 * fb-backfill-profiles.
 */

const ok = (data: unknown): FnResult => ({ data, error: null });

const LOGIN_URL = "https://whataapp.myecomex.com/auth/login";

function welcomeBody(customerName: string, email: string, password: string, businessName: string): string {
  return (
    `Welcome ${customerName}! Your account for ${businessName} is ready.\n` +
    `Email: ${email}\nPassword: ${password}\n` +
    `Login: ${LOGIN_URL}\n` +
    `Important: change your password after first login (Settings → Profile → Security).`
  );
}

// --- send-welcome-email (delivered in-app) -----------------------------------

interface WelcomeBody {
  to?: string;
  customerName?: string;
  email?: string;
  tempPassword?: string;
  businessName?: string;
  tenant_id?: string;
}

/** send-welcome-email: deliver the welcome message as an in-app notification. */
export async function sendWelcomeEmail(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as WelcomeBody;
  if (!body.to || !body.customerName || !body.email || !body.tempPassword) {
    return ok({ success: false, error: "Missing required fields" });
  }
  const tenantId = body.tenant_id ?? ctx.tenantId;
  if (!tenantId) return ok({ success: false, error: "tenant_id is required" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ success: false, error: "Forbidden tenant" });

  void notify({
    tenantId,
    type: "welcome",
    title: "Welcome to Ecomex Automation",
    body: welcomeBody(body.customerName, body.email, body.tempPassword, body.businessName ?? "your business"),
    url: "/settings",
  });
  return ok({ success: true });
}

// --- test-welcome-message / admin-test-welcome-message (delivered in-app) ----

interface TestWelcomeBody {
  phone?: string;
  message?: string;
  customerName?: string;
  email?: string;
  tempPassword?: string;
  businessName?: string;
  tenant_id?: string;
}

/** test-welcome-message: send a test welcome notification to the caller's tenant. */
export async function testWelcomeMessage(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as TestWelcomeBody;
  const tenantId = body.tenant_id ?? ctx.tenantId;
  if (!tenantId) return ok({ success: false, error: "tenant_id is required" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ success: false, error: "Forbidden tenant" });

  const text =
    body.message ??
    welcomeBody(
      body.customerName ?? "Customer",
      body.email ?? "test@example.com",
      body.tempPassword ?? "Temp@TestPass123",
      body.businessName ?? "your business",
    );
  void notify({ tenantId, type: "welcome_test", title: "Test welcome message", body: text, url: "/settings" });
  return ok({ success: true, message: "Notification sent" });
}

/** admin-test-welcome-message: admin-only test notification to a target tenant. */
export async function adminTestWelcomeMessage(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return ok({ success: false, error: "Admin privileges required" });
  const body = raw as TestWelcomeBody;
  if (!body.tenant_id) return ok({ success: false, error: "tenant_id is required" });
  if (!body.message) return ok({ success: false, error: "Message is required" });
  void notify({ tenantId: body.tenant_id, type: "welcome_test", title: "Test message", body: body.message, url: "/settings" });
  return ok({ success: true, message: "Notification sent" });
}

// --- resend-welcome-notification (admin-only) --------------------------------

interface ResendBody {
  order_id?: string;
  notification_type?: "whatsapp" | "email" | "all";
  temp_password?: string;
}

interface ExternalOrderRow {
  id: string;
  tenant_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  business_name: string;
}

/** resend-welcome-notification: admin re-sends onboarding creds (in-app). */
export async function resendWelcomeNotification(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  if (!ctx.isAdmin) return ok({ success: false, error: "Admin privileges required" });
  const body = raw as ResendBody;
  if (!body.order_id) return ok({ success: false, error: "order_id is required" });

  const order = (await dbGet(
    "SELECT id, tenant_id, user_id, customer_name, customer_email, business_name FROM external_sales_orders WHERE id = ? LIMIT 1",
    body.order_id,
  )) as ExternalOrderRow | undefined;
  if (!order) return ok({ success: false, error: "Order not found" });

  const password = body.temp_password ?? generateTempPassword();

  // Rotate the user's credential so the password we send is valid.
  if (order.user_id) {
    try {
      const { hashPassword } = await import("better-auth/crypto");
      const hash = await hashPassword(password);
      await dbRun(
        "UPDATE account SET password = ?, updated_at = ? WHERE user_id = ? AND provider_id = 'credential'",
        hash,
        Math.floor(Date.now() / 1000),
        order.user_id,
      );
    } catch (err) {
      return ok({ success: false, error: `Failed to reset password: ${err instanceof Error ? err.message : "error"}` });
    }
  }

  if (!order.tenant_id) return ok({ success: false, error: "Order has no tenant" });
  void notify({
    tenantId: order.tenant_id,
    type: "welcome",
    title: "Welcome to Ecomex Automation",
    body: welcomeBody(order.customer_name, order.customer_email, password, order.business_name),
    userId: order.user_id ?? undefined,
    url: "/settings",
  });

  await dbRun(
    "INSERT INTO admin_audit_logs (id, admin_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, 'resend_welcome_notification', 'external_sales_order', ?, ?, ?)",
    crypto.randomUUID(),
    ctx.userId,
    order.id,
    JSON.stringify({ notification_type: body.notification_type ?? "all" }),
    new Date().toISOString(),
  );

  return ok({ success: true, notifications: { in_app_sent: true }, temp_password: password });
}

// --- report-system-error -----------------------------------------------------

interface ErrorReport {
  source?: "tenant" | "admin" | "public";
  tenant_id?: string;
  user_id?: string;
  user_email?: string;
  error_message?: string;
  error_type?: string;
  page_url?: string;
  component_name?: string;
}

/** report-system-error: record a client error as admin notification + ticket. */
export async function reportSystemError(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const r = raw as ErrorReport;
  if (!r.error_message || !r.page_url) {
    return ok({ error: "Missing required fields: error_message and page_url" });
  }
  // Tenant context is taken from the caller, not trusted from the body, unless
  // the caller is an admin reporting cross-tenant.
  const tenantId = ctx.isAdmin ? r.tenant_id ?? ctx.tenantId ?? null : ctx.tenantId;
  const errorType = r.error_type ?? "unknown";

  // De-dup: skip identical errors within the last 10 minutes.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const recent = await dbGet(
    "SELECT 1 FROM admin_notifications WHERE type = 'system_error' AND created_at >= ? AND message LIKE ? LIMIT 1",
    tenMinAgo,
    `%${r.error_message.substring(0, 50)}%`,
  );
  if (recent) return ok({ success: true, skipped: true, reason: "duplicate_within_10_minutes" });

  let ticketNumber: string | null = null;
  if (tenantId) {
    ticketNumber = `ERR-${Date.now().toString(36).toUpperCase()}`;
    await dbRun(
      "INSERT INTO support_tickets (id, tenant_id, user_id, subject, description, category, priority, status, ticket_number) VALUES (?, ?, ?, ?, ?, 'error_report', 'high', 'open', ?)",
      crypto.randomUUID(),
      tenantId,
      r.user_id ?? ctx.userId,
      `[Auto] ${errorType.toUpperCase()} Error: ${r.error_message.substring(0, 100)}`,
      `Page: ${r.page_url}\nComponent: ${r.component_name ?? "N/A"}\n\n${r.error_message}`,
      ticketNumber,
    );
  }

  await dbRun(
    "INSERT INTO admin_notifications (id, type, title, message, tenant_id, entity_type, entity_id, metadata, created_at) VALUES (?, 'system_error', ?, ?, ?, 'error', ?, ?, ?)",
    crypto.randomUUID(),
    `${errorType.toUpperCase()} Error in ${r.source ?? "unknown"} panel`,
    r.error_message.substring(0, 200),
    tenantId,
    ticketNumber,
    JSON.stringify({ source: r.source, error_type: errorType, page_url: r.page_url, component_name: r.component_name }),
    new Date().toISOString(),
  );

  return ok({ success: true, ticket_number: ticketNumber, notification_sent: true });
}

// --- fb-backfill-profiles ----------------------------------------------------

interface BackfillBody {
  tenant_id?: string;
  batch_size?: number;
  force?: boolean;
}

/** fb-backfill-profiles: refresh fb_contacts missing name/profile pic, tenant-scoped. */
export async function fbBackfillProfiles(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as BackfillBody;
  const tenantId = body.tenant_id ?? ctx.tenantId;
  if (!tenantId) return ok({ error: "tenant_id is required" });
  if (!ctx.isAdmin && tenantId !== ctx.tenantId) return ok({ error: "Forbidden tenant" });

  const batchSize = Math.min(Math.max(body.batch_size ?? 50, 1), 100);
  const force = body.force === true;

  const rows = force
    ? ((await dbAll(
        "SELECT id, psid FROM fb_contacts WHERE tenant_id = ? ORDER BY updated_at ASC LIMIT ?",
        tenantId,
        batchSize,
      )) as Array<{ id: string; psid: string }>)
    : ((await dbAll(
        "SELECT id, psid FROM fb_contacts WHERE tenant_id = ? AND (name IS NULL OR profile_pic_url IS NULL) LIMIT ?",
        tenantId,
        batchSize,
      )) as Array<{ id: string; psid: string }>);

  if (rows.length === 0) {
    return ok({ success: true, message: "No contacts need profile updates", processed: 0, total: 0 });
  }

  let successCount = 0;
  let failCount = 0;
  for (const row of rows) {
    const res = await fbRefreshProfile({ contact_id: row.id, force }, ctx);
    const data = res.data as { success?: boolean };
    if (data?.success) successCount += 1;
    else failCount += 1;
  }

  const remaining = (
    (await dbGet(
      "SELECT COUNT(*)::int AS n FROM fb_contacts WHERE tenant_id = ? AND (name IS NULL OR profile_pic_url IS NULL)",
      tenantId,
    )) as { n: number }
  ).n;

  return ok({
    success: true,
    processed: rows.length,
    success_count: successCount,
    fail_count: failCount,
    remaining,
  });
}

export const WELCOME_HANDLERS = {
  "send-welcome-email": sendWelcomeEmail,
  "test-welcome-message": testWelcomeMessage,
  "admin-test-welcome-message": adminTestWelcomeMessage,
  "resend-welcome-notification": resendWelcomeNotification,
  "report-system-error": reportSystemError,
  "fb-backfill-profiles": fbBackfillProfiles,
};
