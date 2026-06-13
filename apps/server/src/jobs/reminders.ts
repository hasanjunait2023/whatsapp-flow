import { dbGet, dbAll, dbRun } from "../db/raw.js";
import { notify } from "../services/notify.js";

/**
 * subscription-reminder-cron port. Walks active reminder_settings, finds the
 * subscriptions matching each rule's days_offset, and notifies the tenant owner
 * — idempotent per (tenant, reminder_type, day). Each send is recorded in
 * reminder_logs.
 *
 * The Supabase original fanned out over WhatsApp/email. There is no email
 * transport in v1, so reminders are delivered as in-app notifications through
 * the shared notify() entry point (in-app row + SSE + web-push), matching how
 * every other server-side notification is sent.
 */

interface ReminderSetting {
  id: string;
  reminder_type: string;
  channel: string;
  template_id: string | null;
  days_offset: string | number[];
}

interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  current_period_end: string;
  status: string;
}

function dateOnly(d: Date): string {
  return d.toISOString().split("T")[0];
}

function statusForType(type: string): string | null {
  if (type === "expiry_warning") return "active";
  if (type === "payment_overdue") return "past_due";
  if (type === "trial_ending") return "trialing";
  return null;
}

async function subscriptionsForReminder(setting: ReminderSetting): Promise<SubscriptionRow[]> {
  const offsets: number[] = Array.isArray(setting.days_offset)
    ? setting.days_offset
    : (JSON.parse(setting.days_offset || "[]") as number[]);
  const status = statusForType(setting.reminder_type);
  if (!status) return [];

  const now = new Date();
  const seen = new Set<string>();
  const out: SubscriptionRow[] = [];
  for (const offset of offsets) {
    const target = new Date(now);
    // expiry/trial look forward; overdue looks back. UTC math keeps the day
    // boundary aligned with the UTC ISO timestamps stored on subscriptions.
    target.setUTCDate(target.getUTCDate() + (setting.reminder_type === "payment_overdue" ? -offset : offset));
    const day = dateOnly(target);
    const rows = (await dbAll(
      `SELECT id, tenant_id, plan_id, current_period_end, status FROM subscriptions
         WHERE status = ? AND current_period_end >= ? AND current_period_end < ?`,
      status,
      `${day}T00:00:00`,
      `${day}T23:59:59`,
    )) as SubscriptionRow[];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

function defaultMessage(type: string, tenantName: string, planName: string, expiry: string, days: number): string {
  if (type === "expiry_warning") {
    return `Your ${planName} subscription for ${tenantName} expires on ${expiry} (${days} days remaining). Please renew to avoid interruption.`;
  }
  if (type === "payment_overdue") {
    return `Your payment for ${tenantName} is ${days} days overdue. Please complete payment to restore full access.`;
  }
  if (type === "trial_ending") {
    return `Your trial for ${tenantName} ends on ${expiry} (${days} days remaining). Upgrade now to keep all features.`;
  }
  return `Reminder about your subscription for ${tenantName}.`;
}

export interface ReminderResult {
  total_sent: number;
  total_skipped: number;
}

/** subscription-reminder-cron: send due renewal/overdue/trial reminders. */
export async function runSubscriptionReminders(): Promise<ReminderResult> {
  const settings = (await dbAll(
    "SELECT id, reminder_type, channel, template_id, days_offset FROM reminder_settings WHERE is_active = true",
  )) as ReminderSetting[];

  let sent = 0;
  let skipped = 0;
  const today = dateOnly(new Date());

  for (const setting of settings) {
    for (const sub of await subscriptionsForReminder(setting)) {
      // Idempotency: one reminder of this type per tenant per day.
      const already = await dbGet(
        "SELECT 1 FROM reminder_logs WHERE tenant_id = ? AND reminder_type = ? AND sent_at >= ? LIMIT 1",
        sub.tenant_id,
        setting.reminder_type,
        today,
      );
      if (already) {
        skipped += 1;
        continue;
      }

      const tenant = (await dbGet("SELECT name FROM tenants WHERE id = ? LIMIT 1", sub.tenant_id)) as
        | { name: string }
        | undefined;
      const plan = (await dbGet("SELECT name FROM plans WHERE id = ? LIMIT 1", sub.plan_id)) as
        | { name: string }
        | undefined;
      const owner = (await dbGet(
        "SELECT user_id FROM user_roles WHERE tenant_id = ? AND role = 'owner' LIMIT 1",
        sub.tenant_id,
      )) as { user_id: string } | undefined;

      const expiryDate = new Date(sub.current_period_end);
      const days = Math.abs(Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const body = defaultMessage(
        setting.reminder_type,
        tenant?.name ?? "Your Business",
        plan?.name ?? "Subscription",
        expiryDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        days,
      );

      void notify({
        tenantId: sub.tenant_id,
        type: "subscription_reminder",
        title: "Subscription reminder",
        body,
        userId: owner?.user_id,
        url: "/billing",
        metadata: { reminder_type: setting.reminder_type },
      });
      await dbRun(
        "INSERT INTO reminder_logs (id, tenant_id, subscription_id, reminder_type, channel, status, sent_at) VALUES (?, ?, ?, ?, ?, 'sent', ?)",
        crypto.randomUUID(),
        sub.tenant_id,
        sub.id,
        setting.reminder_type,
        setting.channel,
        new Date().toISOString(),
      );
      sent += 1;
    }
  }

  return { total_sent: sent, total_skipped: skipped };
}
