import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.GROWTH_TELEGRAM_CHAT_ID = "founder-chat";

// Intercept outbound Telegram so queueApproval's card delivery succeeds against a
// fake message_id (same approach as growth-content.test.ts). WAHA is stubbed via
// vi.spyOn on the client, so no real HTTP leaves the test.
let nextMessageId = 3000;
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
  marketingLeads,
  adminMarketingCampaigns,
  adminMarketingEnrollments,
  adminMarketingSends,
} = await import("../src/db/schema.js");
const { dbRun, dbGet } = await import("../src/db/raw.js");
const approvals = await import("../src/services/growth/approvals.js");
const { enrollLeadInFunnel, advanceFunnelEnrollments } = await import(
  "../src/services/growth/funnel.js"
);
const {
  FUNNEL_CAMPAIGN_NAME,
  FUNNEL_CAMPAIGN_TYPE,
  FUNNEL_FREQUENCY_PER_WEEK,
  FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
  FUNNEL_STEPS,
} = await import("../src/services/growth/funnel-campaign.js");
const { SEND_MARKETING_MESSAGE_JOB } = await import(
  "../src/services/growth/marketing-send.js"
);
const { registerGrowthJobs } = await import("../src/services/growth/index.js");
const waha = await import("../src/waha/client.js");

let campaignId: string;

async function seedCampaign(): Promise<void> {
  campaignId = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO admin_marketing_campaigns
       (id, name, type, status, frequency_per_week, min_days_between_messages,
        use_whatsapp, use_email, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, true, true, ?, ?)`,
    campaignId,
    FUNNEL_CAMPAIGN_NAME,
    FUNNEL_CAMPAIGN_TYPE,
    FUNNEL_FREQUENCY_PER_WEEK,
    FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
    now,
    now,
  );
}

async function insertLead(opts: { whatsapp?: string | null; email?: string } = {}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO marketing_leads
       (id, full_name, email, whatsapp_number, business_name, source, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'demo_request', 'new', ?, ?)`,
    id,
    "Rahim Uddin",
    opts.email ?? `lead-${id}@example.com`,
    opts.whatsapp === undefined ? "+8801711111111" : opts.whatsapp,
    "Rahim Store",
    now,
    now,
  );
  return id;
}

/** Force an enrollment's due time into the past so the next tick picks it up. */
async function makeDue(enrollmentId: string, secondsAgo = 60): Promise<void> {
  const past = new Date(Date.now() - secondsAgo * 1000).toISOString();
  await dbRun(
    `UPDATE admin_marketing_enrollments SET next_message_at = ? WHERE id = ?`,
    past,
    enrollmentId,
  );
}

beforeEach(async () => {
  await db.delete(growthApprovals);
  await db.delete(jobQueue);
  await db.delete(adminMarketingSends);
  await db.delete(adminMarketingEnrollments);
  await db.delete(adminMarketingCampaigns);
  await db.delete(marketingLeads);
  vi.restoreAllMocks();
});

describe("enrollLeadInFunnel", () => {
  it("creates an active enrollment due immediately (entity_type='lead')", async () => {
    await seedCampaign();
    const leadId = await insertLead();

    const enrollmentId = await enrollLeadInFunnel(leadId);
    expect(enrollmentId).not.toBeNull();

    const rows = await db.select().from(adminMarketingEnrollments);
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_type).toBe("lead");
    expect(rows[0].entity_id).toBe(leadId);
    expect(rows[0].status).toBe("active");
    expect(rows[0].current_step).toBe(0);
    expect(rows[0].next_message_at).not.toBeNull();
  });

  it("is idempotent: a repeat enroll does not duplicate the enrollment", async () => {
    await seedCampaign();
    const leadId = await insertLead();
    const first = await enrollLeadInFunnel(leadId);
    const second = await enrollLeadInFunnel(leadId);
    expect(second).toBe(first);
    expect(await db.select().from(adminMarketingEnrollments)).toHaveLength(1);
  });

  it("no-ops (returns null) when the campaign is not seeded", async () => {
    const leadId = await insertLead();
    expect(await enrollLeadInFunnel(leadId)).toBeNull();
    expect(await db.select().from(adminMarketingEnrollments)).toHaveLength(0);
  });
});

describe("advanceFunnelEnrollments — draft tick", () => {
  it("drafts the next step as an approval, NOT a send", async () => {
    await seedCampaign();
    const leadId = await insertLead();
    const enrollmentId = (await enrollLeadInFunnel(leadId))!;
    await makeDue(enrollmentId);

    const queued = await advanceFunnelEnrollments();
    expect(queued).toBe(1);

    // An approval row was created for Day0; nothing in the job queue (no send).
    const apvs = await db.select().from(growthApprovals);
    expect(apvs).toHaveLength(1);
    expect(apvs[0].status).toBe("awaiting_approval");
    expect(apvs[0].execute_job_kind).toBe(SEND_MARKETING_MESSAGE_JOB);
    expect(apvs[0].summary).toContain("[funnel");
    expect(await db.select().from(jobQueue)).toHaveLength(0);
    // No send recorded until the message is actually delivered post-approval.
    expect(await db.select().from(adminMarketingSends)).toHaveLength(0);

    // Enrollment advanced to step 1 with a future next_message_at.
    const enr = (await db.select().from(adminMarketingEnrollments))[0];
    expect(enr.current_step).toBe(1);
  });

  it("is idempotent: a second tick does not re-queue the same step (no double-queue)", async () => {
    await seedCampaign();
    const leadId = await insertLead();
    const enrollmentId = (await enrollLeadInFunnel(leadId))!;
    await makeDue(enrollmentId);

    const first = await advanceFunnelEnrollments();
    const second = await advanceFunnelEnrollments();

    expect(first).toBe(1);
    expect(second).toBe(0); // step 1 isn't due yet
    expect(await db.select().from(growthApprovals)).toHaveLength(1);
  });

  it("respects min_days_between_messages: a recent send blocks the next draft", async () => {
    await seedCampaign();
    const leadId = await insertLead();
    const enrollmentId = (await enrollLeadInFunnel(leadId))!;

    // Simulate: step 0 already drafted/sent moments ago, step 1 is now due.
    await dbRun(
      `UPDATE admin_marketing_enrollments
          SET current_step = 1, last_message_at = ?, next_message_at = ?
        WHERE id = ?`,
      new Date().toISOString(), // last message just now -> inside the min gap
      new Date(Date.now() - 60_000).toISOString(), // due
      enrollmentId,
    );

    const queued = await advanceFunnelEnrollments();
    expect(queued).toBe(0); // frequency cap blocks it
    expect(await db.select().from(growthApprovals)).toHaveLength(0);

    // The cap guard should have pushed next_message_at out (not left it in the past).
    const enr = (await db.select().from(adminMarketingEnrollments))[0];
    expect(new Date(enr.next_message_at!).getTime()).toBeGreaterThan(Date.now());
  });

  it("no-ops when the campaign is not seeded", async () => {
    expect(await advanceFunnelEnrollments()).toBe(0);
  });
});

describe("send_marketing_message — execution path (after approval only)", () => {
  it("routes whatsapp to WAHA only when whatsapp_number is present, and only after approval", async () => {
    registerGrowthJobs();
    const { processDueJobs } = await import("../src/jobs/queue.js");
    const sendText = vi
      .spyOn(waha.wahaClient, "sendText")
      .mockResolvedValue({ id: "true_msg_1" });

    await seedCampaign();
    const leadId = await insertLead({ whatsapp: "+8801712345678" });
    const enrollmentId = (await enrollLeadInFunnel(leadId))!;
    await makeDue(enrollmentId);

    // Draft the Day0 (whatsapp) step.
    await advanceFunnelEnrollments();
    const approvalId = (await db.select().from(growthApprovals))[0].id;

    // Pre-approval: WAHA must NOT have been called.
    expect(sendText).not.toHaveBeenCalled();

    // Founder approves -> execute job queued -> processed -> WAHA send fires.
    await approvals.decideApproval(approvalId, "approve", "founder");
    await processDueJobs();

    expect(sendText).toHaveBeenCalledTimes(1);
    const arg = sendText.mock.calls[0][0];
    expect(arg.chatId).toBe("8801712345678@c.us");
    expect(arg.text.length).toBeGreaterThan(0);

    const send = (await db.select().from(adminMarketingSends))[0];
    expect(send.channel).toBe("whatsapp");
    expect(send.status).toBe("sent");

    const apv = (await db.select().from(growthApprovals))[0];
    expect(apv.status).toBe("executed");
  });

  it("does NOT call WAHA when the lead has no whatsapp_number (no consent signal)", async () => {
    registerGrowthJobs();
    const { processDueJobs } = await import("../src/jobs/queue.js");
    const sendText = vi
      .spyOn(waha.wahaClient, "sendText")
      .mockResolvedValue({ id: "true_msg_2" });

    // Queue a whatsapp send approval directly with an empty `to`.
    const enrollmentId = crypto.randomUUID();
    const now = new Date().toISOString();
    await seedCampaign();
    await dbRun(
      `INSERT INTO admin_marketing_enrollments
         (id, campaign_id, entity_type, entity_id, status, current_step, current_week,
          enrolled_at, next_message_at, week_reset_at, month_reset_at)
       VALUES (?, ?, 'lead', ?, 'active', 0, 1, ?, ?, ?, ?)`,
      enrollmentId,
      campaignId,
      crypto.randomUUID(),
      now,
      now,
      now,
      now,
    );

    const approvalId = await approvals.queueApproval({
      artifactType: "outreach_batch",
      artifactId: enrollmentId,
      summary: "[funnel Day0] No Number",
      payload: {
        channel: "whatsapp",
        enrollmentId,
        sequenceStep: 0,
        leadId: "x",
        to: "", // no number -> not consented
        content: FUNNEL_STEPS[0],
      },
      executeJobKind: SEND_MARKETING_MESSAGE_JOB,
    });
    await approvals.decideApproval(approvalId, "approve", "founder");
    await processDueJobs();

    expect(sendText).not.toHaveBeenCalled();
    const send = (await db.select().from(adminMarketingSends))[0];
    expect(send.channel).toBe("whatsapp");
    expect(send.status).toBe("failed");
  });

  it("email step is stubbed: records 'pending' and does not throw", async () => {
    registerGrowthJobs();
    const { processDueJobs } = await import("../src/jobs/queue.js");
    const sendText = vi.spyOn(waha.wahaClient, "sendText").mockResolvedValue({ id: "x" });

    const enrollmentId = crypto.randomUUID();
    const approvalId = await approvals.queueApproval({
      artifactType: "funnel_email",
      artifactId: enrollmentId,
      summary: "[funnel Day5] Trial",
      payload: {
        channel: "email",
        enrollmentId,
        sequenceStep: 3,
        leadId: "x",
        to: "lead@example.com",
        content: FUNNEL_STEPS[3],
      },
      executeJobKind: SEND_MARKETING_MESSAGE_JOB,
    });
    await approvals.decideApproval(approvalId, "approve", "founder");
    await processDueJobs();

    expect(sendText).not.toHaveBeenCalled(); // email never touches WAHA
    const send = (await db.select().from(adminMarketingSends))[0];
    expect(send.channel).toBe("email");
    expect(send.status).toBe("pending"); // stub: no real delivery
  });
});
