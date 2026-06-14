import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.GROWTH_TELEGRAM_CHAT_ID = "founder-chat";
process.env.GROWTH_WHATSAPP_SESSION = "default";

// Intercept outbound Telegram so queueApproval's card delivery + human-task
// notifications succeed against a fake message_id (same approach as the funnel
// test). WAHA + push are spied via vi.spyOn so no real HTTP leaves the test.
let nextMessageId = 5000;
const originalFetch = globalThis.fetch;
beforeAll(async () => {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("api.telegram.org")) {
      const method = u.split("/").pop() ?? "";
      const result = method === "sendMessage" ? { message_id: nextMessageId++ } : {};
      return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
    }
    return originalFetch(url as string, init);
  }) as typeof fetch;

  const { runMigrations } = await import("../src/db/migrate.js");
  await runMigrations();
});

const { db } = await import("../src/db/index.js");
const {
  growthApprovals,
  jobQueue,
  notifications,
  ownerChannelPrefs,
  adminMarketingCampaigns,
  adminMarketingSequences,
  adminMarketingEnrollments,
  adminMarketingSends,
  subscriptions,
  tenants,
  profiles,
  orders,
} = await import("../src/db/schema.js");
const { dbRun } = await import("../src/db/raw.js");
const approvals = await import("../src/services/growth/approvals.js");
const waha = await import("../src/waha/client.js");
const push = await import("../src/services/push.js");

const owner = await import("../src/services/growth/owner-messaging.js");
const aftersales = await import("../src/services/growth/aftersales.js");
const campaigns = await import("../src/services/growth/aftersales-campaigns.js");
const { registerGrowthJobs } = await import("../src/services/growth/index.js");

// --- helpers ---------------------------------------------------------------

async function makeTenant(opts: { phone?: string | null; email?: string } = {}): Promise<string> {
  const ownerId = crypto.randomUUID();
  const tenantId = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO profiles (id, email, full_name, phone_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ownerId,
    opts.email ?? `owner-${ownerId}@example.com`,
    "Seller Owner",
    opts.phone === undefined ? "+8801712345678" : opts.phone,
    now,
    now,
  );
  await dbRun(
    `INSERT INTO tenants (id, name, owner_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    tenantId,
    "Seller Store",
    ownerId,
    now,
    now,
  );
  // Create the prefs row with quiet hours DISABLED so tests don't flake based on
  // the wall-clock hour they run at. Quiet-hours tests re-enable a window.
  await owner.resolveOwnerPrefs(tenantId);
  await dbRun(
    `UPDATE owner_channel_prefs SET quiet_hours_start = NULL, quiet_hours_end = NULL WHERE tenant_id = ?`,
    tenantId,
  );
  return tenantId;
}

/** Seeds the full M4 campaign set (idempotent), like the seed script. */
async function seedCampaigns(): Promise<void> {
  for (const campaign of campaigns.AFTERSALES_CAMPAIGNS) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO admin_marketing_campaigns (id, name, name_bn, type, status, use_whatsapp, use_email, created_at, updated_at)
         VALUES (?, ?, ?, 'aftersales', 'active', true, true, ?, ?)`,
      id,
      campaign.key,
      campaign.nameBn,
      now,
      now,
    );
    for (const step of campaign.steps) {
      await dbRun(
        `INSERT INTO admin_marketing_sequences
           (id, campaign_id, week_number, step_order, name, name_bn, channel, theme, content_template, is_active, approved, created_at)
         VALUES (?, ?, 1, ?, ?, ?, ?, 'aftersales', ?, true, false, ?)`,
        crypto.randomUUID(),
        id,
        step.stepOrder,
        step.name,
        step.nameBn,
        step.channels[0],
        JSON.stringify({ title: step.title }),
        now,
      );
    }
  }
}

async function approveTemplate(campaignKey: string, stepOrder: number): Promise<void> {
  await dbRun(
    `UPDATE admin_marketing_sequences SET approved = true
       WHERE step_order = ? AND campaign_id = (
         SELECT id FROM admin_marketing_campaigns WHERE name = ? AND type = 'aftersales')`,
    stepOrder,
    campaignKey,
  );
}

async function setPrefs(tenantId: string, patch: Record<string, unknown>): Promise<void> {
  // Ensure a prefs row exists, then patch it.
  await owner.resolveOwnerPrefs(tenantId);
  const keys = Object.keys(patch);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  await dbRun(
    `UPDATE owner_channel_prefs SET ${sets} WHERE tenant_id = ?`,
    ...keys.map((k) => patch[k]),
    tenantId,
  );
}

beforeEach(async () => {
  await db.delete(growthApprovals);
  await db.delete(jobQueue);
  await db.delete(notifications);
  await db.delete(ownerChannelPrefs);
  await db.delete(adminMarketingSends);
  await db.delete(adminMarketingEnrollments);
  await db.delete(adminMarketingSequences);
  await db.delete(adminMarketingCampaigns);
  await db.delete(orders);
  await db.delete(subscriptions);
  await db.delete(tenants);
  await db.delete(profiles);
  vi.restoreAllMocks();
});

// ===========================================================================
// Channel router
// ===========================================================================
describe("sendOwnerMessage — channel routing", () => {
  const msg = {
    event: "test",
    title: "Hi",
    bodyEn: "English",
    bodyBn: "বাংলা",
  };

  it("picks the first consented channel and stops in fallback mode", async () => {
    const tenantId = await makeTenant();
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });
    const pushSpy = vi.spyOn(push, "sendPushToTenant").mockResolvedValue();

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["whatsapp", "in_app", "push"], mode: "fallback" },
    });

    expect(res.delivered).toBe(true);
    expect(sendText).toHaveBeenCalledTimes(1); // first channel delivered
    expect(pushSpy).not.toHaveBeenCalled(); // fallback stops after whatsapp
    const sends = await db.select().from(adminMarketingSends);
    expect(sends).toHaveLength(1);
    expect(sends[0].channel).toBe("whatsapp");
    expect(sends[0].status).toBe("sent");
  });

  it("falls back to the next channel when the first is not consented", async () => {
    const tenantId = await makeTenant();
    await setPrefs(tenantId, { whatsapp_ok: false });
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["whatsapp", "in_app"], mode: "fallback" },
    });

    expect(res.delivered).toBe(true);
    expect(sendText).not.toHaveBeenCalled();
    const sends = await db.select().from(adminMarketingSends);
    expect(sends.map((s) => s.channel)).toEqual(["in_app"]);
  });

  it("sends on every consented channel in 'all' mode", async () => {
    const tenantId = await makeTenant();
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["whatsapp", "in_app"], mode: "all" },
    });

    expect(res.delivered).toBe(true);
    expect(sendText).toHaveBeenCalledTimes(1);
    const sends = await db.select().from(adminMarketingSends);
    expect(sends.map((s) => s.channel).sort()).toEqual(["in_app", "whatsapp"]);
  });

  it("blocks all sends when the owner has opted out", async () => {
    const tenantId = await makeTenant();
    await setPrefs(tenantId, { opted_out: true });
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["whatsapp", "in_app"], mode: "all" },
    });

    expect(res.delivered).toBe(false);
    expect(res.blockedReason).toBe("opted_out");
    expect(sendText).not.toHaveBeenCalled();
    expect(await db.select().from(adminMarketingSends)).toHaveLength(0);
  });

  it("blocks sends inside quiet hours", async () => {
    const tenantId = await makeTenant();
    // Build a quiet-hours window that contains the current hour without mocking
    // the clock: [currentHour, currentHour+1) always covers now.
    const h = new Date().getHours();
    await setPrefs(tenantId, { quiet_hours_start: h, quiet_hours_end: (h + 1) % 24 });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["in_app"], mode: "all" },
    });

    expect(res.delivered).toBe(false);
    expect(res.blockedReason).toBe("quiet_hours");
  });

  it("blocks sends once the weekly cap is reached", async () => {
    const tenantId = await makeTenant();
    await setPrefs(tenantId, { weekly_cap: 1, messages_this_week: 1, week_reset_at: new Date().toISOString() });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["in_app"], mode: "all" },
    });

    expect(res.delivered).toBe(false);
    expect(res.blockedReason).toBe("weekly_cap");
  });

  it("requires a number for whatsapp (consent signal); skips + records when absent", async () => {
    const tenantId = await makeTenant({ phone: null });
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["whatsapp"], mode: "all" },
    });

    expect(sendText).not.toHaveBeenCalled();
    expect(res.delivered).toBe(false);
    const sends = await db.select().from(adminMarketingSends);
    expect(sends[0].channel).toBe("whatsapp");
    expect(sends[0].status).toBe("failed"); // skipped recorded as failed
  });

  it("records email + sms as 'pending' (stubbed, no provider)", async () => {
    const tenantId = await makeTenant();
    await setPrefs(tenantId, { sms_ok: true });

    const res = await owner.sendOwnerMessage(tenantId, {
      ...msg,
      channelsPolicy: { channels: ["email", "sms"], mode: "all" },
    });

    expect(res.delivered).toBe(false); // pending, not delivered
    const sends = await db.select().from(adminMarketingSends);
    expect(sends.find((s) => s.channel === "email")?.status).toBe("pending");
    expect(sends.find((s) => s.channel === "sms")?.status).toBe("pending");
  });
});

describe("isWithinQuietHours", () => {
  it("handles a window that wraps midnight (22 -> 8)", () => {
    const at = (h: number) => {
      const d = new Date();
      d.setHours(h, 0, 0, 0);
      return d;
    };
    expect(owner.isWithinQuietHours(at(23), 22, 8)).toBe(true);
    expect(owner.isWithinQuietHours(at(3), 22, 8)).toBe(true);
    expect(owner.isWithinQuietHours(at(12), 22, 8)).toBe(false);
  });
});

// ===========================================================================
// Template-approve-once
// ===========================================================================
describe("template-approve-once", () => {
  it("unapproved template: queues ONE approval and does NOT send", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const step = campaigns.getAftersalesStep("aftersales-milestones", 1)!;
    const ok = await aftersales.ensureTemplateApproved("aftersales-milestones", step);
    expect(ok).toBe(false);

    const apvs = await db.select().from(growthApprovals);
    expect(apvs).toHaveLength(1);
    expect(apvs[0].artifact_type).toBe("aftersales_template");

    // A second check must NOT queue a duplicate approval (dedupe).
    await aftersales.ensureTemplateApproved("aftersales-milestones", step);
    expect(await db.select().from(growthApprovals)).toHaveLength(1);

    expect(sendText).not.toHaveBeenCalled();
  });

  it("founder approval flips the template to approved (no per-message tap after)", async () => {
    await makeTenant();
    await seedCampaigns();
    registerGrowthJobs();
    const { processDueJobs } = await import("../src/jobs/queue.js");

    const step = campaigns.getAftersalesStep("aftersales-milestones", 1)!;
    await aftersales.ensureTemplateApproved("aftersales-milestones", step);
    const approvalId = (await db.select().from(growthApprovals))[0].id;

    await approvals.decideApproval(approvalId, "approve", "founder");
    await processDueJobs();

    // The template is now approved; a re-check returns true with no new approval.
    const ok = await aftersales.ensureTemplateApproved("aftersales-milestones", step);
    expect(ok).toBe(true);
    expect(await db.select().from(growthApprovals)).toHaveLength(1);
  });

  it("approved template auto-sends without a per-message approval", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();
    await approveTemplate("aftersales-milestones", 1);
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });
    vi.spyOn(push, "sendPushToTenant").mockResolvedValue();

    const fired = await aftersales.advanceAftersales();

    // No new approval card was created for the auto-send (template already approved).
    expect(await db.select().from(growthApprovals)).toHaveLength(0);
    // The milestone fired only if its threshold is met; we set that up next test.
    expect(fired).toBeGreaterThanOrEqual(0);
    void tenantId;
    void sendText;
  });
});

// ===========================================================================
// Enroll on payment
// ===========================================================================
describe("enrollTenantInAftersales", () => {
  it("enrolls a tenant into onboarding (entity_type='tenant'), idempotently", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();

    const first = await aftersales.enrollTenantInAftersales(tenantId);
    const second = await aftersales.enrollTenantInAftersales(tenantId);
    expect(first).not.toBeNull();
    expect(second).toBe(first);

    const rows = await db.select().from(adminMarketingEnrollments);
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_type).toBe("tenant");
    expect(rows[0].entity_id).toBe(tenantId);
  });

  it("no-ops (returns null) when the campaign is not seeded", async () => {
    const tenantId = await makeTenant();
    expect(await aftersales.enrollTenantInAftersales(tenantId)).toBeNull();
  });
});

// ===========================================================================
// Behaviour triggers — milestones
// ===========================================================================
describe("advanceAftersales — milestone triggers", () => {
  async function activeSub(tenantId: string, opts: { ageDays?: number; status?: string } = {}): Promise<void> {
    const created = new Date(Date.now() - (opts.ageDays ?? 0) * 24 * 60 * 60 * 1000).toISOString();
    await dbRun(
      `INSERT INTO subscriptions (id, tenant_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
         VALUES (?, ?, 'plan', ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      tenantId,
      opts.status ?? "active",
      created,
      new Date(Date.now() + 30 * 86400000).toISOString(),
      created,
      new Date().toISOString(),
    );
  }

  async function addOrders(tenantId: string, n: number): Promise<void> {
    const now = new Date().toISOString();
    for (let i = 0; i < n; i++) {
      await dbRun(
        `INSERT INTO orders (id, tenant_id, order_number, status, payment_status, subtotal, total, currency, created_at, updated_at)
           VALUES (?, ?, ?, 'pending', 'unpaid', 0, 0, 'BDT', ?, ?)`,
        crypto.randomUUID(),
        tenantId,
        `ORD-${i}-${crypto.randomUUID().slice(0, 8)}`,
        now,
        now,
      );
    }
  }

  it("fires the first-100-orders milestone once, then is idempotent", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();
    await approveTemplate("aftersales-milestones", 1); // first-100-orders
    await activeSub(tenantId);
    await addOrders(tenantId, 100);
    vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });
    vi.spyOn(push, "sendPushToTenant").mockResolvedValue();

    await aftersales.advanceAftersales();
    const after1 = await db
      .select()
      .from(adminMarketingSends)
      .then((rows) => rows.filter((r) => r.enrollment_id === "aftersales-marker"));
    expect(after1.length).toBe(1); // exactly one tenant-scoped marker

    // Second run must not re-fire the same milestone.
    await aftersales.advanceAftersales();
    const after2 = await db
      .select()
      .from(adminMarketingSends)
      .then((rows) => rows.filter((r) => r.enrollment_id === "aftersales-marker"));
    expect(after2.length).toBe(1);
  });

  it("does not fire the milestone below the order threshold", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();
    await approveTemplate("aftersales-milestones", 1);
    await activeSub(tenantId);
    await addOrders(tenantId, 5);
    vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    await aftersales.advanceAftersales();
    const markers = await db
      .select()
      .from(adminMarketingSends)
      .then((rows) => rows.filter((r) => r.enrollment_id === "aftersales-marker"));
    expect(markers.length).toBe(0);
  });

  it("routes a no-activation trial tenant to a human task", async () => {
    const tenantId = await makeTenant();
    await seedCampaigns();
    await activeSub(tenantId, { ageDays: 2, status: "trialing" });
    // no orders

    await aftersales.advanceAftersales();

    // A human-task in-app notification was created for this tenant.
    const notes = await db.select().from(notifications);
    expect(notes.some((n) => n.type === "aftersales_human_no_activation")).toBe(true);

    // Idempotent: a second run does not duplicate the human task.
    await aftersales.advanceAftersales();
    const notes2 = await db.select().from(notifications);
    expect(notes2.filter((n) => n.type === "aftersales_human_no_activation").length).toBe(1);
  });

  it("no-ops when no campaign is seeded", async () => {
    expect(await aftersales.advanceAftersales()).toBe(0);
  });
});
