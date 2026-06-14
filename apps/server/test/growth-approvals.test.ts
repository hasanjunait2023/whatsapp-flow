import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.GROWTH_TELEGRAM_CHAT_ID = "founder-chat";

// Intercept outbound Telegram sends; record approval-card sends and assign a
// fake message_id so editTelegramMessage has something to target.
interface TgCall { method: string; body: Record<string, unknown> }
const tgCalls: TgCall[] = [];
let nextMessageId = 1000;

const originalFetch = globalThis.fetch;
beforeAll(async () => {
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("api.telegram.org")) {
      const method = u.split("/").pop() ?? "";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      tgCalls.push({ method, body });
      const result =
        method === "sendMessage" ? { message_id: nextMessageId++ } : {};
      return new Response(JSON.stringify({ ok: true, result }), { status: 200 });
    }
    return originalFetch(url as string, init);
  }) as typeof fetch;

  const { runMigrations } = await import("../src/db/migrate.js");
  await runMigrations();
});

const { db } = await import("../src/db/index.js");
const { growthApprovals, socialPosts, jobQueue } = await import("../src/db/schema.js");
const approvals = await import("../src/services/growth/approvals.js");
const { PUBLISH_SOCIAL_POST_JOB } = await import("../src/services/growth/social.js");
const { registerGrowthJobs } = await import("../src/services/growth/index.js");
const { telegramWebhookRoute } = await import("../src/routes/webhooks/telegram.js");

// Drives the Telegram webhook with a callback_query (button tap). The webhook
// secret is unset in test, so the transport gate is open and only the identity
// gate (founder id / configured chat) is exercised.
async function postCallbackQuery(body: {
  id: string;
  data: string;
  fromId?: string | number;
  chatId?: string | number;
}): Promise<void> {
  const update = {
    callback_query: {
      id: body.id,
      data: body.data,
      ...(body.fromId != null ? { from: { id: body.fromId } } : {}),
      ...(body.chatId != null ? { message: { chat: { id: body.chatId }, message_id: 1 } } : {}),
    },
  };
  await telegramWebhookRoute.request("/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(update),
  });
}

beforeEach(async () => {
  tgCalls.length = 0;
  await db.delete(growthApprovals);
  await db.delete(socialPosts);
  await db.delete(jobQueue);
});

describe("queueApproval", () => {
  it("inserts an awaiting_approval row and sends an approval card", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Test post",
      payload: { foo: "bar" },
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });

    const row = (await db.select().from(growthApprovals))[0];
    expect(row.id).toBe(id);
    expect(row.status).toBe("awaiting_approval");
    expect(row.tg_chat_id).toBe("founder-chat");
    expect(row.tg_message_id).not.toBeNull();

    const card = tgCalls.find((c) => c.method === "sendMessage");
    const keyboard = (card?.body.reply_markup as { inline_keyboard: unknown[][] }).inline_keyboard;
    expect(keyboard[0]).toHaveLength(2);
    expect((keyboard[0][0] as { callback_data: string }).callback_data).toBe(`apv:${id}`);
  });
});

describe("decideApproval — idempotency", () => {
  it("approve enqueues the execute job exactly once even on double-tap", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Test",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });

    const first = await approvals.decideApproval(id, "approve", "founder");
    const second = await approvals.decideApproval(id, "approve", "founder");

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false); // double-tap is a no-op

    const jobs = await db.select().from(jobQueue);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe(PUBLISH_SOCIAL_POST_JOB);

    const row = (await db.select().from(growthApprovals))[0];
    expect(row.status).toBe("approved");
    expect(row.execute_job_id).toBe(jobs[0].id);
  });

  it("reject after approve is a no-op (first decision wins)", async () => {
    const id = await approvals.queueApproval({
      artifactType: "ad",
      summary: "Spend",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    await approvals.decideApproval(id, "approve", "founder");
    const res = await approvals.decideApproval(id, "reject", "founder");
    expect(res.changed).toBe(false);
    expect((await db.select().from(growthApprovals))[0].status).toBe("approved");
  });
});

describe("claimApprovalForExecution — double-execution guard", () => {
  it("claims an approved row once; a second concurrent claim returns null", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Test",
      payload: { a: 1 },
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    await approvals.decideApproval(id, "approve", "founder");

    const claimed = await approvals.claimApprovalForExecution(id);
    expect(claimed).not.toBeNull();
    expect(claimed?.status).toBe("executing");

    // After success, a retry must NOT re-claim.
    await approvals.markApprovalExecuted(id, true);
    const reclaim = await approvals.claimApprovalForExecution(id);
    expect(reclaim).toBeNull();
  });

  it("never claims an awaiting_approval row (gate not yet opened)", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Test",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    expect(await approvals.claimApprovalForExecution(id)).toBeNull();
  });
});

describe("expireStaleApprovals", () => {
  it("expires only awaiting rows past their TTL", async () => {
    const fresh = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "fresh",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    const stale = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "stale",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
      expiresInMs: -1000, // already past
    });

    const n = await approvals.expireStaleApprovals();
    expect(n).toBe(1);

    const rows = await db.select().from(growthApprovals);
    expect(rows.find((r) => r.id === stale)!.status).toBe("expired");
    expect(rows.find((r) => r.id === fresh)!.status).toBe("awaiting_approval");
  });
});

describe("telegram webhook — fail-closed authz", () => {
  async function queuePost(): Promise<string> {
    return approvals.queueApproval({
      artifactType: "social_post",
      summary: "Authz test",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
  }

  it("rejects a tap when NEITHER founder id nor configured chat matches", async () => {
    const id = await queuePost();
    // FOUNDER_TG_USER_ID is unset; chat id is some other chat, not founder-chat.
    await postCallbackQuery({ id: "cb1", data: `apv:${id}`, fromId: 999, chatId: "stranger-chat" });

    const row = (await db.select().from(growthApprovals))[0];
    expect(row.status).toBe("awaiting_approval"); // decision NOT honored
    expect(await db.select().from(jobQueue)).toHaveLength(0);

    const ack = tgCalls.find((c) => c.method === "answerCallbackQuery");
    expect(ack?.body.text).toBe("Not authorized");
  });

  it("rejects a tap with no identity signals at all (no from, no chat)", async () => {
    const id = await queuePost();
    await postCallbackQuery({ id: "cb2", data: `apv:${id}` });

    expect((await db.select().from(growthApprovals))[0].status).toBe("awaiting_approval");
    expect(await db.select().from(jobQueue)).toHaveLength(0);
  });

  it("honors a tap from the configured growth chat", async () => {
    const id = await queuePost();
    await postCallbackQuery({ id: "cb3", data: `apv:${id}`, chatId: "founder-chat" });

    const row = (await db.select().from(growthApprovals))[0];
    expect(row.status).toBe("approved"); // chat id matches GROWTH_TELEGRAM_CHAT_ID
    expect(await db.select().from(jobQueue)).toHaveLength(1);
  });
});

describe("markApprovalExecuted — guarded no-op", () => {
  it("does not clobber a row that is no longer 'executing'", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Guard test",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    await approvals.decideApproval(id, "approve", "founder");

    // Claim -> executing -> first mark wins (executed).
    await approvals.claimApprovalForExecution(id);
    await approvals.markApprovalExecuted(id, true);
    expect((await db.select().from(growthApprovals))[0].status).toBe("executed");

    // A stale retry that reports a FAILURE must NOT overwrite the executed row.
    await approvals.markApprovalExecuted(id, false, "stale failure");
    const row = (await db.select().from(growthApprovals))[0];
    expect(row.status).toBe("executed");
    expect(row.error).toBeNull();
  });

  it("does not re-claim a 'failed' approval (requires explicit re-approval)", async () => {
    const id = await approvals.queueApproval({
      artifactType: "social_post",
      summary: "Failed re-claim test",
      payload: {},
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    await approvals.decideApproval(id, "approve", "founder");
    await approvals.claimApprovalForExecution(id);
    await approvals.markApprovalExecuted(id, false, "boom");
    expect((await db.select().from(growthApprovals))[0].status).toBe("failed");

    // A queue retry must NOT silently re-publish a failed approval.
    expect(await approvals.claimApprovalForExecution(id)).toBeNull();
  });
});

describe("publish_social_post job — execution path", () => {
  it("publishes via Postiz and marks the approval executed", async () => {
    registerGrowthJobs();
    const { processDueJobs } = await import("../src/jobs/queue.js");

    // Stub Postiz so no real HTTP call is made.
    const postiz = await import("../src/services/postiz/client.js");
    vi.spyOn(postiz.postizClient, "createPost").mockResolvedValue({ id: "postiz-123" });

    const socialPostId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { dbRun } = await import("../src/db/raw.js");
    await dbRun(
      `INSERT INTO social_posts (id, platform, channel_ids, body, status, created_at, updated_at)
       VALUES (?, 'x', ?, 'hi', 'awaiting_approval', ?, ?)`,
      socialPostId,
      JSON.stringify(["chan-1"]),
      now,
      now,
    );

    const id = await approvals.queueApproval({
      artifactType: "social_post",
      artifactId: socialPostId,
      summary: "Publish me",
      payload: {
        socialPostId,
        postiz: { type: "now", date: now, posts: [{ integrationId: "chan-1", content: "hi" }] },
      },
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });
    await approvals.decideApproval(id, "approve", "founder");
    await processDueJobs();

    const approval = (await db.select().from(growthApprovals))[0];
    expect(approval.status).toBe("executed");
    const post = (await db.select().from(socialPosts))[0];
    expect(post.status).toBe("published");
    expect(post.postiz_post_id).toBe("postiz-123");
  });
});
