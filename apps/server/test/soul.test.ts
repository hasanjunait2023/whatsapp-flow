import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

// Mock network-touching modules before importing the orchestrator.
vi.mock("../src/services/soul/ingest-website.js", () => ({
  crawlWebsite: vi.fn(async () => ({
    text: "## /\nAcme Sweets. Bengali dessert shop in Dhaka. Open 9am-9pm.",
    pagesVisited: 1,
  })),
}));
vi.mock("../src/services/soul/synthesize.js", () => ({
  synthesizeSoul: vi.fn(async () => ({
    business_profile: { name: "Acme Sweets", description: "Dessert shop", category: "Food" },
    tone: { style: "warm", formality: "friendly", emoji_usage: "light" },
    products_summary: "Mishti, cakes",
    faqs: [{ question: "Hours?", answer: "9am-9pm daily" }],
    hours: { schedule: "9am-9pm daily", timezone: "Asia/Dhaka" },
    policies: { shipping: "Dhaka only", returns: null, payment: "bKash, cash" },
    languages: ["bn", "en"],
  })),
}));

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, agentSouls, soulSources, jobQueue } = await import("../src/db/schema.js");
const { enqueueJob, processDueJobs, registerJobHandler } = await import("../src/jobs/queue.js");
const { startSoulIngestion, approveSoul, getSoul, getApprovedSystemPrompt, registerSoulJobs } =
  await import("../src/services/soul/index.js");
const { buildSystemPrompt } = await import("../src/services/soul/prompt-builder.js");

const TENANT = "tttt1111-1111-1111-1111-111111111111";

beforeAll(async () => {
  await runMigrations();
  registerSoulJobs();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
});

beforeEach(async () => {
  await db.delete(agentSouls);
  await db.delete(soulSources);
  await db.delete(jobQueue);
});

describe("job queue", () => {
  it("runs a registered handler and marks the job done", async () => {
    const ran: unknown[] = [];
    registerJobHandler("test_job", async (payload) => {
      ran.push(payload);
    });
    await enqueueJob({ kind: "test_job", payload: { x: 1 } });
    const processed = await processDueJobs();
    expect(processed).toBe(1);
    expect(ran).toEqual([{ x: 1 }]);
    expect((await db.select().from(jobQueue))[0].status).toBe("done");
  });

  it("does not run jobs scheduled in the future", async () => {
    registerJobHandler("future_job", async () => {});
    await enqueueJob({
      kind: "future_job",
      runAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(await processDueJobs()).toBe(0);
  });

  it("coalesces jobs with the same dedupe key", async () => {
    const id1 = await enqueueJob({ kind: "j", dedupeKey: "k", payload: { n: 1 } });
    const id2 = await enqueueJob({ kind: "j", dedupeKey: "k", payload: { n: 2 } });
    expect(id2).toBe(id1);
    const rows = await db.select().from(jobQueue);
    expect(rows).toHaveLength(1);
    expect(rows[0].payload).toEqual({ n: 2 });
  });

  it("retries failed jobs and fails permanently after max attempts", async () => {
    registerJobHandler("flaky", async () => {
      throw new Error("boom");
    });
    await enqueueJob({ kind: "flaky" });
    await processDueJobs();
    let row = (await db.select().from(jobQueue))[0];
    expect(row.status).toBe("queued"); // retry scheduled
    expect(row.attempts).toBe(1);

    // Force the retries due now and drain them.
    for (let i = 0; i < 2; i++) {
      await db.update(jobQueue).set({ run_at: new Date(0).toISOString() });
      await processDueJobs();
    }
    row = (await db.select().from(jobQueue))[0];
    expect(row.status).toBe("failed");
    expect(row.attempts).toBe(3);
    expect(row.last_error).toBe("boom");
  });
});

describe("soul ingestion flow", () => {
  it("ingests sources, synthesizes, and reaches ready", async () => {
    await startSoulIngestion(TENANT, { websiteUrl: "https://acme-sweets.example" });
    expect((await getSoul(TENANT))?.status).toBe("ingesting");

    await processDueJobs();

    const soul = (await getSoul(TENANT))!;
    expect(soul.status).toBe("ready");
    expect((soul.business_profile as { name: string }).name).toBe("Acme Sweets");
    const sources = await db.select().from(soulSources);
    expect(sources).toHaveLength(1);
    expect(sources[0].status).toBe("fetched");
  });

  it("rejects starting with no sources", async () => {
    await expect(startSoulIngestion(TENANT, {})).rejects.toThrow();
  });

  it("rejects non-http URLs", async () => {
    await expect(startSoulIngestion(TENANT, { websiteUrl: "ftp://x" })).rejects.toThrow();
    await expect(startSoulIngestion(TENANT, { websiteUrl: "not a url" })).rejects.toThrow();
  });

  it("approve applies edits, builds the prompt cache, and exposes it to agents", async () => {
    await startSoulIngestion(TENANT, { websiteUrl: "https://acme-sweets.example" });
    await processDueJobs();

    expect(await getApprovedSystemPrompt(TENANT)).toBeNull(); // not approved yet

    await approveSoul(TENANT, {
      faqs: [{ question: "Delivery?", answer: "Dhaka only, 24h" }],
    });
    const soul = (await getSoul(TENANT))!;
    expect(soul.status).toBe("approved");

    const prompt = (await getApprovedSystemPrompt(TENANT))!;
    expect(prompt).toContain("Acme Sweets");
    expect(prompt).toContain("Delivery?"); // edited FAQ won
    expect(prompt).not.toContain("Hours?"); // original FAQ replaced
  });

  it("refuses approval before synthesis completes", async () => {
    await startSoulIngestion(TENANT, { websiteUrl: "https://acme-sweets.example" });
    await expect(approveSoul(TENANT)).rejects.toThrow("not ready");
  });
});

describe("prompt builder", () => {
  it("renders all soul sections deterministically", () => {
    const prompt = buildSystemPrompt({
      business_profile: { name: "Acme", description: "Shop", category: "Retail" },
      tone: { style: "playful", formality: "casual", emoji_usage: "frequent" },
      products_summary: "Widgets",
      faqs: [{ question: "Q1", answer: "A1" }],
      hours: { schedule: "24/7", timezone: "UTC" },
      policies: { shipping: "Worldwide", returns: "30 days", payment: null },
      languages: ["en"],
    });
    expect(prompt).toContain("Acme");
    expect(prompt).toContain("playful");
    expect(prompt).toContain("Q1");
    expect(prompt).toContain("24/7 (UTC)");
    expect(prompt).toContain("Returns: 30 days");
    expect(prompt).not.toContain("Payment:"); // null policy omitted
    expect(prompt).toContain("hand off to a human");
  });
});
