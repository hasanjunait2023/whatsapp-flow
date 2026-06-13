import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.TELEGRAM_BOT_USERNAME = "TestBot";

// No real LLM / Telegram API calls.
const sendTelegramCalls: Array<{ chatId: string; text: string }> = [];
vi.mock("../src/llm/registry.js", () => ({
  resolveLlm: vi.fn(() => ({
    provider: {
      name: "gemini",
      chat: vi.fn(async () => ({
        text: "# Daily Report\nAll good.",
        toolCalls: [],
        usage: { promptTokens: 100, completionTokens: 50 },
        stopReason: "stop",
      })),
    },
    model: "gemini-2.0-flash",
    apiKey: "k",
    temperature: null,
    source: "platform",
  })),
  defaultModelFor: vi.fn(() => "gemini-2.0-flash"),
}));

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, telegramLinks, ceoReports, agentSchedules, jobQueue, orders, tenantDailyStats } =
  await import("../src/db/schema.js");
const telegram = await import("../src/services/telegram.js");
const { generateCeoReport, gatherSnapshot } = await import("../src/services/ceo/report.js");
const { registerCeoJobs, checkCeoSchedules, enqueueCeoReport, CEO_REPORT_JOB } = await import(
  "../src/services/ceo/index.js"
);
const { processDueJobs } = await import("../src/jobs/queue.js");

// Intercept outbound Telegram sends.
const originalFetch = globalThis.fetch;
beforeAll(async () => {
  await runMigrations();
  registerCeoJobs();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    if (u.includes("api.telegram.org")) {
      const body = JSON.parse(String(init?.body)) as { chat_id: string; text: string };
      sendTelegramCalls.push({ chatId: body.chat_id, text: body.text });
      return new Response(JSON.stringify({ ok: true, result: {} }), { status: 200 });
    }
    return originalFetch(url as string, init);
  }) as typeof fetch;
});

const TENANT = "tttt1111-1111-1111-1111-111111111111";
const USER = "user-1";

beforeEach(async () => {
  sendTelegramCalls.length = 0;
  await db.delete(telegramLinks);
  await db.delete(ceoReports);
  await db.delete(agentSchedules);
  await db.delete(jobQueue);
  await db.delete(orders);
  await db.delete(tenantDailyStats);
});

describe("telegram linking", () => {
  it("creates a single-use deep link with TTL", async () => {
    const link = await telegram.startTelegramLink(TENANT, USER);
    expect(link.deep_link).toBe(`https://t.me/TestBot?start=${link.link_code}`);
    expect(new Date(link.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("binds the chat on /start and is single-use", async () => {
    const { link_code } = await telegram.startTelegramLink(TENANT, USER);
    const first = await telegram.consumeLinkCode(link_code, "chat-42");
    expect(first.linked).toBe(true);
    expect(first.tenantId).toBe(TENANT);
    expect(await telegram.linkedChatIds(TENANT)).toEqual(["chat-42"]);

    const second = await telegram.consumeLinkCode(link_code, "attacker-chat");
    expect(second.linked).toBe(false);
    expect(await telegram.linkedChatIds(TENANT)).toEqual(["chat-42"]); // unchanged
  });

  it("rejects expired codes", async () => {
    const { link_code } = await telegram.startTelegramLink(TENANT, USER);
    await db
      .update(telegramLinks)
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect((await telegram.consumeLinkCode(link_code, "chat-1")).linked).toBe(false);
  });

  it("refreshing replaces the previous pending code", async () => {
    const first = await telegram.startTelegramLink(TENANT, USER);
    await telegram.startTelegramLink(TENANT, USER);
    expect((await telegram.consumeLinkCode(first.link_code, "chat-1")).linked).toBe(false);
    expect(await db.select().from(telegramLinks)).toHaveLength(1);
  });

  it("unlink removes the binding", async () => {
    const { link_code } = await telegram.startTelegramLink(TENANT, USER);
    await telegram.consumeLinkCode(link_code, "chat-9");
    await telegram.unlinkTelegram(TENANT, USER);
    expect(await telegram.linkedChatIds(TENANT)).toEqual([]);
  });
});

describe("ceo reports", () => {
  it("gathers a business snapshot from stats, orders, and agent runs", async () => {
    const today = new Date().toISOString().slice(0, 10);
    await db
      .insert(tenantDailyStats)
      .values({ tenant_id: TENANT, stat_date: today, inbound_count: 12, outbound_count: 8, new_conversations: 3 });
    await db
      .insert(orders)
      .values({ tenant_id: TENANT, order_number: "1001", total: 99.5, status: "pending" });
    const snapshot = await gatherSnapshot(TENANT, 1);
    expect(snapshot.conversations.inbound).toBe(12);
    expect(snapshot.orders.count).toBe(1);
    expect(snapshot.orders.revenue).toBe(99.5);
    expect(snapshot.orders.pending).toBe(1);
  });

  it("generates, stores, and delivers a report to linked chats", async () => {
    const { link_code } = await telegram.startTelegramLink(TENANT, USER);
    await telegram.consumeLinkCode(link_code, "chat-7");

    await generateCeoReport(TENANT, "daily");

    const report = (await db.select().from(ceoReports))[0];
    expect(report.status).toBe("sent");
    expect(report.content_md).toContain("Daily Report");
    expect(sendTelegramCalls).toHaveLength(1);
    expect(sendTelegramCalls[0].chatId).toBe("chat-7");
  });

  it("stores the report even with no linked chat (in-app only)", async () => {
    await generateCeoReport(TENANT, "daily");
    const report = (await db.select().from(ceoReports))[0];
    expect(report.status).toBe("generated");
    expect(sendTelegramCalls).toHaveLength(0);
  });

  it("ceo-run-now enqueues and the job produces a report", async () => {
    await enqueueCeoReport(TENANT, "daily");
    await processDueJobs();
    expect(await db.select().from(ceoReports)).toHaveLength(1);
  });
});

describe("ceo schedules", () => {
  async function insertSchedule(overrides: Record<string, unknown> = {}): Promise<string> {
    const id = crypto.randomUUID();
    await db.insert(agentSchedules).values({
      id,
      tenant_id: TENANT,
      agent: "ceo",
      cadence: "daily",
      report_type: "daily",
      hour_utc: 0, // always due by hour
      enabled: true,
      ...overrides,
    });
    return id;
  }

  it("enqueues a due daily schedule exactly once", async () => {
    await insertSchedule();
    await checkCeoSchedules();
    await checkCeoSchedules(); // dedupe key prevents a second queued job
    const jobs = await db.select().from(jobQueue);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe(CEO_REPORT_JOB);
  });

  it("skips schedules already run today", async () => {
    await insertSchedule({ last_run_at: new Date().toISOString() });
    await checkCeoSchedules();
    expect(await db.select().from(jobQueue)).toHaveLength(0);
  });

  it("skips disabled schedules and future hours", async () => {
    await insertSchedule({ enabled: false });
    await insertSchedule({ report_type: "weekly", cadence: "daily", hour_utc: 23 });
    const isLateInDay = new Date().getUTCHours() >= 23;
    await checkCeoSchedules();
    expect(await db.select().from(jobQueue)).toHaveLength(isLateInDay ? 1 : 0);
  });

  it("running the scheduled job stamps last_run_at", async () => {
    const scheduleId = await insertSchedule();
    await checkCeoSchedules();
    await processDueJobs();
    const schedule = (await db.select().from(agentSchedules)).find((s) => s.id === scheduleId)!;
    expect(schedule.last_run_at).not.toBeNull();
    expect(await db.select().from(ceoReports)).toHaveLength(1);
  });
});

describe("telegram webhook route", () => {
  it("binds a chat via /start and replies", async () => {
    const { telegramWebhookRoute } = await import("../src/routes/webhooks/telegram.js");
    const { Hono } = await import("hono");
    const app = new Hono().route("/webhook", telegramWebhookRoute);

    const { link_code } = await telegram.startTelegramLink(TENANT, USER);
    const res = await app.request("/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { text: `/start ${link_code}`, chat: { id: 555 } },
      }),
    });
    expect(res.status).toBe(200);
    expect(await telegram.linkedChatIds(TENANT)).toEqual(["555"]);
    expect(sendTelegramCalls.at(-1)?.text).toContain("Connected");
  });

  it("rejects requests with a wrong secret token when enforced", async () => {
    vi.resetModules();
    process.env.TELEGRAM_WEBHOOK_SECRET = "s3cret";
    const { telegramWebhookRoute } = await import("../src/routes/webhooks/telegram.js");
    const { Hono } = await import("hono");
    const app = new Hono().route("/webhook", telegramWebhookRoute);

    const res = await app.request("/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { text: "/start abc", chat: { id: 1 } } }),
    });
    expect(res.status).toBe(401);
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    vi.resetModules();
  });

  it("fails closed in production when no secret is configured", async () => {
    vi.resetModules();
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    // Re-importing under NODE_ENV=production re-evaluates db/index.ts, which
    // builds a real pg Pool from DATABASE_URL. The Pool is lazy (no connection
    // until a query) and this fail-closed path returns 401 before any DB call,
    // so a dummy URL just lets the module construct.
    process.env.DATABASE_URL = "postgres://u:p@localhost:5432/db";
    const { telegramWebhookRoute } = await import("../src/routes/webhooks/telegram.js");
    const { Hono } = await import("hono");
    const app = new Hono().route("/webhook", telegramWebhookRoute);

    const res = await app.request("/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: { text: "/start abc", chat: { id: 1 } } }),
    });
    expect(res.status).toBe(401);
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = prevEnv;
    vi.resetModules();
  });
});
