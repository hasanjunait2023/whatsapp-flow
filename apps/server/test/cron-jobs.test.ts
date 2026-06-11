import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const {
  tenants,
  plans,
  subscriptions,
  userRoles,
  reminderSettings,
  webhookEventsLog,
  inAppNotifications,
} = await import("../src/db/schema.js");
const { runSubscriptionReminders } = await import("../src/jobs/reminders.js");
const { runWebhookCleanup } = await import("../src/jobs/cleanup.js");

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function isoDaysFromNow(days: number): string {
  // Anchor to the same UTC day the cron derives from now+offset, at UTC midday,
  // so the [day 00:00, day 23:59) window matches regardless of runner timezone.
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + days);
  const day = target.toISOString().split("T")[0];
  return `${day}T12:00:00.000Z`;
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

beforeAll(() => {
  runMigrations();
  db.insert(tenants)
    .values([
      { id: TENANT_A, name: "Alpha", owner_id: "owner-a" },
      { id: TENANT_B, name: "Beta", owner_id: "owner-b" },
    ])
    .run();
  db.insert(plans)
    .values({ id: "plan-x", name: "Pro", price_monthly: 10 })
    .run();
  db.insert(userRoles)
    .values([
      { id: "ur-a", user_id: "owner-a", tenant_id: TENANT_A, role: "owner" },
      { id: "ur-b", user_id: "owner-b", tenant_id: TENANT_B, role: "owner" },
    ])
    .run();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("subscription-reminder-cron", () => {
  it("notifies only subscriptions whose period_end matches the rule offset, once per day", () => {
    // Expiry warning at 3 days out; A expires in 3 days, B in 30.
    db.insert(reminderSettings)
      .values({ id: "rs-1", reminder_type: "expiry_warning", channel: "both", days_offset: [3], is_active: true })
      .run();
    db.insert(subscriptions)
      .values([
        {
          id: "sub-a",
          tenant_id: TENANT_A,
          plan_id: "plan-x",
          status: "active",
          current_period_start: isoDaysAgo(27),
          current_period_end: isoDaysFromNow(3),
        },
        {
          id: "sub-b",
          tenant_id: TENANT_B,
          plan_id: "plan-x",
          status: "active",
          current_period_start: isoDaysAgo(0),
          current_period_end: isoDaysFromNow(30),
        },
      ])
      .run();

    const result = runSubscriptionReminders();
    expect(result.total_sent).toBe(1);

    // A's owner got the in-app notification; B did not.
    const aNotif = sqlite
      .prepare("SELECT 1 FROM notifications WHERE tenant_id = ? AND type = 'subscription_reminder' LIMIT 1")
      .get(TENANT_A);
    const bNotif = sqlite
      .prepare("SELECT 1 FROM notifications WHERE tenant_id = ? AND type = 'subscription_reminder' LIMIT 1")
      .get(TENANT_B);
    expect(aNotif).toBeTruthy();
    expect(bNotif).toBeUndefined();

    // reminder_logs has one row for A.
    const logCount = sqlite
      .prepare("SELECT COUNT(*) AS n FROM reminder_logs WHERE tenant_id = ?")
      .get(TENANT_A) as { n: number };
    expect(logCount.n).toBe(1);

    // Idempotent: a second run the same day sends nothing more.
    const second = runSubscriptionReminders();
    expect(second.total_sent).toBe(0);
    expect(second.total_skipped).toBe(1);
  });
});

describe("webhook-cleanup-cron", () => {
  it("deletes old webhook logs and old read notifications, keeps recent ones", () => {
    db.insert(webhookEventsLog)
      .values([
        { id: "we-old", tenant_id: TENANT_A, event_type: "message", payload: "{}", created_at: isoDaysAgo(10) },
        { id: "we-new", tenant_id: TENANT_A, event_type: "message", payload: "{}", created_at: isoDaysAgo(1) },
      ])
      .run();
    db.insert(inAppNotifications)
      .values([
        { id: "n-old", tenant_id: TENANT_A, type: "x", title: "t", is_read: true, created_at: isoDaysAgo(40) },
        { id: "n-old-unread", tenant_id: TENANT_A, type: "x", title: "t", is_read: false, created_at: isoDaysAgo(40) },
        { id: "n-new", tenant_id: TENANT_A, type: "x", title: "t", is_read: true, created_at: isoDaysAgo(1) },
      ])
      .run();

    const result = runWebhookCleanup();
    expect(result.webhookEventsDeleted).toBe(1);
    expect(result.notificationsDeleted).toBe(1);

    expect(sqlite.prepare("SELECT 1 FROM webhook_events_log WHERE id = 'we-old'").get()).toBeUndefined();
    expect(sqlite.prepare("SELECT 1 FROM webhook_events_log WHERE id = 'we-new'").get()).toBeTruthy();
    expect(sqlite.prepare("SELECT 1 FROM in_app_notifications WHERE id = 'n-old'").get()).toBeUndefined();
    expect(sqlite.prepare("SELECT 1 FROM in_app_notifications WHERE id = 'n-old-unread'").get()).toBeTruthy();
    expect(sqlite.prepare("SELECT 1 FROM in_app_notifications WHERE id = 'n-new'").get()).toBeTruthy();
  });
});
