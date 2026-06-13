import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.MASTER_KEY = randomBytes(32).toString("hex");

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { llmSettings, llmUsageEvents, subscriptions, plans, tenants } = await import(
  "../src/db/schema.js"
);
const { resolveLlm } = await import("../src/llm/registry.js");
const { recordUsage, checkBudget, tokensUsedThisMonth, costUsd, BudgetExceededError } =
  await import("../src/llm/usage.js");
const { encryptSecret } = await import("../src/lib/crypto.js");

const TENANT = "tttt1111-1111-1111-1111-111111111111";

function clearEnvDefaults(): void {
  delete process.env.LLM_DEFAULT_PROVIDER;
  delete process.env.LLM_DEFAULT_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.GEMINI_API_KEY;
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values({ id: TENANT, name: "T", owner_id: "u" });
});

beforeEach(async () => {
  clearEnvDefaults();
  await db.delete(llmSettings);
  await db.delete(llmUsageEvents);
  await db.delete(subscriptions);
  await db.delete(plans);
});

describe("llm registry", () => {
  it("throws when nothing is configured", async () => {
    await expect(resolveLlm(TENANT)).rejects.toThrow("No LLM provider configured");
  });

  it("falls back to the platform env default", async () => {
    process.env.LLM_DEFAULT_PROVIDER = "gemini";
    process.env.LLM_DEFAULT_MODEL = "gemini-2.0-flash";
    process.env.GEMINI_API_KEY = "env-key";
    const resolved = await resolveLlm(TENANT);
    expect(resolved.provider.name).toBe("gemini");
    expect(resolved.model).toBe("gemini-2.0-flash");
    expect(resolved.apiKey).toBe("env-key");
    expect(resolved.source).toBe("platform");
  });

  it("uses the plan default over the platform default", async () => {
    process.env.LLM_DEFAULT_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "env-key";
    process.env.OPENAI_API_KEY = "openai-platform-key";
    await db.insert(plans).values({
      id: "plan-1",
      name: "Pro",
      features: { llm: { provider: "openai", model: "gpt-4o-mini" } },
    });
    await db.insert(subscriptions).values({
      tenant_id: TENANT,
      plan_id: "plan-1",
      current_period_start: "2026-01-01T00:00:00.000Z",
      current_period_end: "2099-01-01T00:00:00.000Z",
    });
    const resolved = await resolveLlm(TENANT);
    expect(resolved.provider.name).toBe("openai");
    expect(resolved.model).toBe("gpt-4o-mini");
    expect(resolved.source).toBe("plan");
  });

  it("uses tenant BYOK settings above everything and decrypts the key", async () => {
    process.env.LLM_DEFAULT_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "env-key";
    await db.insert(llmSettings).values({
      tenant_id: TENANT,
      provider: "anthropic",
      model: "claude-haiku-4-5-20251001",
      is_byok: true,
      api_key_encrypted: encryptSecret("tenant-secret-key"),
      temperature: 0.3,
    });
    const resolved = await resolveLlm(TENANT);
    expect(resolved.provider.name).toBe("anthropic");
    expect(resolved.apiKey).toBe("tenant-secret-key");
    expect(resolved.temperature).toBe(0.3);
    expect(resolved.source).toBe("tenant");
  });

  it("uses tenant provider choice on the platform key when not BYOK", async () => {
    process.env.OPENAI_API_KEY = "platform-openai";
    await db.insert(llmSettings).values({ tenant_id: TENANT, provider: "openai" });
    const resolved = await resolveLlm(TENANT);
    expect(resolved.provider.name).toBe("openai");
    expect(resolved.apiKey).toBe("platform-openai");
  });
});

describe("llm usage + budget", () => {
  it("records usage events with cost", async () => {
    await recordUsage(TENANT, "hermes", "openai", "gpt-4o-mini", {
      promptTokens: 1_000_000,
      completionTokens: 1_000_000,
    });
    const rows = await db.select().from(llmUsageEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0].cost_usd).toBeCloseTo(0.75); // 0.15 + 0.60
    expect(await tokensUsedThisMonth(TENANT)).toBe(2_000_000);
  });

  it("computes zero cost for unknown models", () => {
    expect(costUsd("unknown-model", { promptTokens: 1000, completionTokens: 1000 })).toBe(0);
  });

  it("passes the budget check when under budget or no budget is set", async () => {
    await expect(checkBudget(TENANT)).resolves.not.toThrow();
    await db.insert(llmSettings).values({ tenant_id: TENANT, monthly_token_budget: 10_000 });
    await recordUsage(TENANT, "soul", "gemini", "gemini-2.0-flash", {
      promptTokens: 4000,
      completionTokens: 1000,
    });
    await expect(checkBudget(TENANT)).resolves.not.toThrow();
  });

  it("throws BudgetExceededError once the budget is consumed", async () => {
    await db.insert(llmSettings).values({ tenant_id: TENANT, monthly_token_budget: 5000 });
    await recordUsage(TENANT, "hermes", "gemini", "gemini-2.0-flash", {
      promptTokens: 4000,
      completionTokens: 1000,
    });
    await expect(checkBudget(TENANT)).rejects.toThrow(BudgetExceededError);
  });

  it("does not count another tenant's usage", async () => {
    await db.insert(llmSettings).values({ tenant_id: TENANT, monthly_token_budget: 5000 });
    await recordUsage("other-tenant", "hermes", "gemini", "gemini-2.0-flash", {
      promptTokens: 9000,
      completionTokens: 9000,
    });
    await expect(checkBudget(TENANT)).resolves.not.toThrow();
  });
});

describe("provider adapters (wire-format normalization)", () => {
  it("openai: maps tool calls and usage", async () => {
    const { openaiProvider } = await import("../src/llm/providers/openai.js");
    const originalFetch = globalThis.fetch;
    let capturedBody: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    function: { name: "lookup_order", arguments: '{"order_number":"42"}' },
                  },
                ],
              },
              finish_reason: "tool_calls",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    try {
      const result = await openaiProvider.chat(
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "where is my order" }],
          tools: [
            { name: "lookup_order", description: "look up", parameters: { type: "object" } },
          ],
        },
        "k",
      );
      expect(result.stopReason).toBe("tool_use");
      expect(result.toolCalls).toEqual([
        { id: "call_1", name: "lookup_order", arguments: { order_number: "42" } },
      ]);
      expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5 });
      expect((capturedBody.tools as unknown[]).length).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("anthropic: maps tool_use blocks and unwraps forced JSON output", async () => {
    const { anthropicProvider } = await import("../src/llm/providers/anthropic.js");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "tool_use", id: "tu_1", name: "__json_output", input: { ok: true } }],
          stop_reason: "tool_use",
          usage: { input_tokens: 7, output_tokens: 3 },
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const result = await anthropicProvider.chat(
        {
          model: "claude-haiku-4-5-20251001",
          messages: [{ role: "user", content: "extract" }],
          jsonSchema: { name: "out", schema: { type: "object" } },
        },
        "k",
      );
      expect(result.text).toBe('{"ok":true}');
      expect(result.toolCalls).toEqual([]);
      expect(result.usage).toEqual({ promptTokens: 7, completionTokens: 3 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("gemini: maps functionCall parts with synthetic ids", async () => {
    const { geminiProvider } = await import("../src/llm/providers/gemini.js");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ functionCall: { name: "check_stock", args: { product_id: "p1" } } }],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 },
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const result = await geminiProvider.chat(
        {
          model: "gemini-2.0-flash",
          messages: [{ role: "user", content: "stock?" }],
          tools: [{ name: "check_stock", description: "", parameters: { type: "object" } }],
        },
        "k",
      );
      expect(result.stopReason).toBe("tool_use");
      expect(result.toolCalls).toEqual([
        { id: "check_stock:0", name: "check_stock", arguments: { product_id: "p1" } },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
