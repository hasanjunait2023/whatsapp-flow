import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.GROWTH_TELEGRAM_CHAT_ID = "founder-chat";

// Intercept outbound Telegram sends so queueApproval's card delivery succeeds
// against a fake message_id (same approach as growth-approvals.test.ts).
let nextMessageId = 2000;
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
const { growthApprovals, socialPosts, jobQueue } = await import("../src/db/schema.js");
const { dbRun } = await import("../src/db/raw.js");
const { draftDueSocialPosts, DRAFT_DUE_PER_RUN_CAP } = await import(
  "../src/services/growth/content-scheduler.js"
);

function dateOffset(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function insertDraft(opts: {
  title?: string;
  platform?: string;
  body?: string;
  plannedFor: string;
}): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO social_posts
       (id, platform, channel_ids, title, body, media_urls, status,
        planned_for, ai_generated, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, true, ?, ?)`,
    id,
    opts.platform ?? "facebook",
    JSON.stringify(["chan-1"]),
    opts.title ?? "Hook line",
    opts.body ?? "Caption body\n\nCTA line",
    JSON.stringify([]),
    opts.plannedFor,
    now,
    now,
  );
  return id;
}

beforeEach(async () => {
  await db.delete(growthApprovals);
  await db.delete(socialPosts);
  await db.delete(jobQueue);
});

describe("draftDueSocialPosts", () => {
  it("routes due drafts to awaiting_approval with an approval row", async () => {
    const a = await insertDraft({ plannedFor: dateOffset(-1) });
    const b = await insertDraft({ plannedFor: dateOffset(0) });

    const queued = await draftDueSocialPosts();
    expect(queued).toBe(2);

    const posts = await db.select().from(socialPosts);
    for (const id of [a, b]) {
      const post = posts.find((p) => p.id === id)!;
      expect(post.status).toBe("awaiting_approval");
      expect(post.approval_id).not.toBeNull();
    }

    const approvals = await db.select().from(growthApprovals);
    expect(approvals).toHaveLength(2);
    expect(approvals.every((r) => r.artifact_type === "social_post")).toBe(true);
    expect(approvals.every((r) => r.status === "awaiting_approval")).toBe(true);
  });

  it("does NOT publish — it only drafts for approval (no execute job queued)", async () => {
    await insertDraft({ plannedFor: dateOffset(0) });
    await draftDueSocialPosts();
    // Approval gate must be untouched: nothing in the job queue until the
    // founder taps Approve.
    expect(await db.select().from(jobQueue)).toHaveLength(0);
  });

  it("is idempotent: a second run does not re-queue the same drafts", async () => {
    await insertDraft({ plannedFor: dateOffset(-1) });

    const first = await draftDueSocialPosts();
    const second = await draftDueSocialPosts();

    expect(first).toBe(1);
    expect(second).toBe(0); // already advanced out of 'draft'
    expect(await db.select().from(growthApprovals)).toHaveLength(1);
  });

  it("leaves future-dated drafts untouched", async () => {
    const future = await insertDraft({ plannedFor: dateOffset(5) });

    const queued = await draftDueSocialPosts();
    expect(queued).toBe(0);

    const post = (await db.select().from(socialPosts)).find((p) => p.id === future)!;
    expect(post.status).toBe("draft");
    expect(post.approval_id).toBeNull();
    expect(await db.select().from(growthApprovals)).toHaveLength(0);
  });

  it("respects the per-run cap, draining the backlog across runs", async () => {
    const overCap = DRAFT_DUE_PER_RUN_CAP + 2;
    for (let i = 0; i < overCap; i += 1) {
      // All due (past-dated); distinct days so ordering is deterministic.
      await insertDraft({ plannedFor: dateOffset(-(i + 1)) });
    }

    const firstRun = await draftDueSocialPosts();
    expect(firstRun).toBe(DRAFT_DUE_PER_RUN_CAP);
    expect(await db.select().from(growthApprovals)).toHaveLength(DRAFT_DUE_PER_RUN_CAP);

    // Remaining backlog is picked up on the next run.
    const secondRun = await draftDueSocialPosts();
    expect(secondRun).toBe(overCap - DRAFT_DUE_PER_RUN_CAP);
    expect(await db.select().from(growthApprovals)).toHaveLength(overCap);
  });

  it("builds a concise [platform] summary from the hook (title)", async () => {
    await insertDraft({
      title: "Customer wrote in Bangla and the AI answered",
      platform: "instagram",
      body: "First line caption\n\nSecond paragraph",
      plannedFor: dateOffset(0),
    });
    await draftDueSocialPosts();

    const approval = (await db.select().from(growthApprovals))[0];
    expect(approval.summary).toBe("[instagram] Customer wrote in Bangla and the AI answered");
  });
});
