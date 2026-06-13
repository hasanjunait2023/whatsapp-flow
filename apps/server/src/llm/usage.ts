import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { llmSettings, llmUsageEvents } from "../db/schema.js";
import type { LlmUsage, ProviderName } from "./types.js";

export type LlmFeature = "hermes" | "soul" | "ceo";

/** USD per 1M tokens: [prompt, completion]. Unknown models fall back to 0. */
const COST_PER_MTOK: Record<string, [number, number]> = {
  "gpt-4o-mini": [0.15, 0.6],
  "gpt-4o": [2.5, 10],
  "claude-haiku-4-5-20251001": [1, 5],
  "claude-sonnet-4-6": [3, 15],
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-pro": [1.25, 10],
};

export class BudgetExceededError extends Error {
  constructor(tenantId: string) {
    super(`Monthly LLM token budget exceeded for tenant ${tenantId}`);
  }
}

export function costUsd(model: string, usage: LlmUsage): number {
  const [promptRate, completionRate] = COST_PER_MTOK[model] ?? [0, 0];
  return (
    (usage.promptTokens * promptRate + usage.completionTokens * completionRate) / 1_000_000
  );
}

export async function recordUsage(
  tenantId: string,
  feature: LlmFeature,
  provider: ProviderName,
  model: string,
  usage: LlmUsage,
): Promise<void> {
  await db.insert(llmUsageEvents).values({
    tenant_id: tenantId,
    feature,
    provider,
    model,
    prompt_tokens: usage.promptTokens,
    completion_tokens: usage.completionTokens,
    cost_usd: costUsd(model, usage),
  });
}

function monthStartIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Total tokens (prompt + completion) used by the tenant this calendar month. */
export async function tokensUsedThisMonth(tenantId: string): Promise<number> {
  const rows = await db
    .select({
      total: sql<number>`COALESCE(SUM(prompt_tokens + completion_tokens), 0)`,
    })
    .from(llmUsageEvents)
    .where(
      and(eq(llmUsageEvents.tenant_id, tenantId), gte(llmUsageEvents.created_at, monthStartIso())),
    );
  return Number(rows[0]?.total ?? 0);
}

/**
 * Throws BudgetExceededError when the tenant has a monthly_token_budget and
 * has already consumed it. Call BEFORE every LLM request. No budget row or a
 * null budget means unlimited.
 */
export async function checkBudget(tenantId: string): Promise<void> {
  const settings = (
    await db
      .select({ budget: llmSettings.monthly_token_budget })
      .from(llmSettings)
      .where(eq(llmSettings.tenant_id, tenantId))
      .limit(1)
  )[0];
  const budget = settings?.budget;
  if (budget == null) return;
  if ((await tokensUsedThisMonth(tenantId)) >= budget) {
    throw new BudgetExceededError(tenantId);
  }
}
