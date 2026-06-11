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

const { db, sqlite } = await import("../src/db/index.js");
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
beforeAll(() => {
  runMigrations();
  registerCeoJobs();
  db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" }).run();
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

beforeEach(() => {
  sendTelegramCalls.length = 0;
  db.delete(telegramLinks).run();
  db.delete(ceoReports).run();
  db.delete(agentSchedules).run();
  db.delete(jobQueue).run();
  db.delete(orders).run();
  db.delete(tenantDailyStats).run();
});

describe("telegram linking", () => {
  it("creates a single-use deep link with TTL", () => {
    const link = telegram.startTelegramLink(TENANT, USER);
    expect(link.deep_link).toBe(`https://t.me/TestBot?start=${link.link_code}`);
    expect(new Date(link.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("binds the chat on /start and is single-use", () => {
    const { link_code } = telegram.startTelegramLink(TENANT, USER);
    const first = telegram.consumeLinkCode(link_code, "chat-42");
    expect(first.linked).toBe(true);
    expect(first.tenantId).toBe(TENANT);
    expect(telegram.linkedChatIds(TENANT)).toEqual(["chat-42"]);

    const second = telegram.consumeLinkCode(link_code, "attacker-chat");
    expect(second.linked).toBe(false);
    expect(telegram.linkedChatIds(TENANT)).toEqual(["chat-42"]); // unchanged
  });

  it("rejects expired codes", () => {
    const { link_code } = telegram.startTelegramLink(TENANT, USER);
    db.update(telegramLinks)
      .set({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .run();
    expect(telegram.consumeLinkCode(link_code, "chat-1").linked).toBe(false);
  });

  it("refreshing replaces the previous pending code", () => {
    const first = telegram.startTelegramLink(TENANT, USER);
    telegram.startTelegramLink(TENANT, USER);
    expect(telegram.consumeLinkCode(first.link_code, "chat-1").linked).toBe(false);
    expect(db.select().from(telegramLinks).all()).toHaveLength(1);
  });

  it("unlink removes the binding", () => {
    const { link_code } = telegram.startTelegramLink(TENANT, USER);
    telegram.consumeLinkCode(link_code, "chat-9");
    telegram.unlinkTelegram(TENANT, USER);
    expect(telegram.linkedChatIds(TENANT)).toEqual([]);
  });
});

describe("ceo reports", () => {
  it("gathers a business snapshot from stats, orders, and agent runs", () => {
    const today = new Date().toISOString().slice(0, 10);
    db.insert(tenantDailyStats)
      .values({ tenant_id: TENANT, stat_date: today, inbound_count: 12, outbound_count: 8, new_conversations: 3 })
      .run();
    db.insert(orders)
      .values({ tenant_id: TENANT, order_number: "1001", total: 99.5, status: "pending" })
      .run();
    const snapshot = gatherSnapshot(TENANT, 1);
    expect(snapshot.conversations.inbound).toBe(12);
    expect(snapshot.orders.count).toBe(1);
    expect(snapshot.orders.revenue).toBe(99.5);
    expect(snapshot.orders.pending).toBe(1);
  });

  it("generates, stores, and delivers a report to linked chats", async () => {
    const { link_code } = telegram.startTelegramLink(TENANT, USER);
    telegram.consumeLinkCode(link_code, "chat-7");

    await generateCeoReport(TENANT, "daily");

    const report = db.select().from(ceoReports).all()[0];
    expect(report.status).toBe("sent");
    expect(report.content_md).toContain("Daily Report");
    expect(sendTelegramCalls).toHaveLength(1);
    expect(sendTelegramCalls[0].chatId).toBe("chat-7");
  });

  it("stores the report even with no linked chat (in-app only)", async () => {
    await generateCeoReport(TENANT, "daily");
    const report = db.select().from(ceoReports).all()[0];
    expect(report.status).toBe("generated");
    expect(sendTelegramCalls).toHaveLength(0);
  });

  it("ceo-run-now enqueues and the job produces a report", async () => {
    enqueueCeoReport(TENANT, "daily");
    await processDueJobs();
    expect(db.select().from(ceoReports).all()).toHaveLength(1);
  });
});

describe("ceo schedules", () => {
  function insertSchedule(overrides: Record<string, unknown> = {}): string {
    const id = crypto.randomUUID();
    db.insert(agentSchedules)
      .values({
        id,
        tenant_id: TENANT,
        agent: "ceo",
        cadence: "daily",
        report_type: "daily",
        hour_utc: 0, // always due by hour
        enabled: true,
        ...overrides,
      })
      .run();
    return id;
  }

  it("enqueues a due daily schedule exactly once", () => {
    insertSchedule();
    checkCeoSchedules();
    checkCeoSchedules(); // dedupe key prevents a second queued job
    const jobs = db.select().from(jobQueue).all();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe(CEO_REPORT_JOB);
  });

  it("skips schedules already run today", () => {
    insertSchedule({ last_run_at: new Date().toISOString() });
    checkCeoSchedules();
    expect(db.select().from(jobQueue).all()).toHaveLength(0);
  });

  it("skips disabled schedules and future hours", () => {
    insertSchedule({ enabled: false });
    insertSchedule({ report_type: "weekly", cadence: "daily", hour_utc: 23 });
    const isLateInDay = new Date().getUTCHours() >= 23;
    checkCeoSchedules();
    expect(db.select().from(jobQueue).all()).toHaveLength(isLateInDay ? 1 : 0);
  });

  it("running the scheduled job stamps last_run_at", async () => {
    const scheduleId = insertSchedule();
    checkCeoSchedules();
    await processDueJobs();
    const schedule = db.select().from(agentSchedules).all().find((s) => s.id === scheduleId)!;
    expect(schedule.last_run_at).not.toBeNull();
    expect(db.select().from(ceoReports).all()).toHaveLength(1);
  });
});

describe("telegram webhook route", () => {
  it("binds a chat via /start and replies", async () => {
    const { telegramWebhookRoute } = await import("../src/routes/webhooks/telegram.js");
    const { Hono } = await import("hono");
    const app = new Hono().route("/webhook", telegramWebhookRoute);

    const { link_code } = telegram.startTelegramLink(TENANT, USER);
    const res = await app.request("/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { text: `/start ${link_code}`, chat: { id: 555 } },
      }),
    });
    expect(res.status).toBe(200);
    expect(telegram.linkedChatIds(TENANT)).toEqual(["555"]);
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
});
