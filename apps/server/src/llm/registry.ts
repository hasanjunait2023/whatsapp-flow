import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { llmSettings, subscriptions, plans } from "../db/schema.js";
import { decryptSecret } from "../lib/crypto.js";
import { openaiProvider } from "./providers/openai.js";
import { anthropicProvider } from "./providers/anthropic.js";
import { geminiProvider } from "./providers/gemini.js";
import type { LlmProvider, ProviderName } from "./types.js";

const PROVIDERS: Record<ProviderName, LlmProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  gemini: geminiProvider,
};

const ENV_KEY_BY_PROVIDER: Record<ProviderName, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

export interface ResolvedLlm {
  provider: LlmProvider;
  model: string;
  apiKey: string;
  temperature: number | null;
  /** "tenant" (BYOK) | "plan" | "platform" — where the config came from. */
  source: "tenant" | "plan" | "platform";
}

function isProviderName(v: unknown): v is ProviderName {
  return v === "openai" || v === "anthropic" || v === "gemini";
}

function platformKeyFor(provider: ProviderName): string | null {
  return process.env[ENV_KEY_BY_PROVIDER[provider]] ?? null;
}

interface PlanLlmConfig {
  provider?: string;
  model?: string;
}

/** Reads plans.features.llm = { provider, model } for the tenant's active plan. */
async function planDefault(tenantId: string): Promise<PlanLlmConfig | null> {
  const rows = await db
    .select({ features: plans.features })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.plan_id, plans.id))
    .where(eq(subscriptions.tenant_id, tenantId))
    .limit(1);
  const features = rows[0]?.features as { llm?: PlanLlmConfig } | null | undefined;
  return features?.llm ?? null;
}

/**
 * Resolution chain: tenant BYOK settings → plan default → platform env default.
 * Throws when no usable provider+key combination exists.
 */
export async function resolveLlm(tenantId: string): Promise<ResolvedLlm> {
  const settings = (
    await db.select().from(llmSettings).where(eq(llmSettings.tenant_id, tenantId)).limit(1)
  )[0];

  // 1. Tenant BYOK: own provider, model, and key.
  if (settings?.is_byok && isProviderName(settings.provider) && settings.api_key_encrypted) {
    return {
      provider: PROVIDERS[settings.provider],
      model: settings.model ?? defaultModelFor(settings.provider),
      apiKey: decryptSecret(settings.api_key_encrypted),
      temperature: settings.temperature,
      source: "tenant",
    };
  }

  // 2. Tenant-chosen provider/model on the platform key.
  if (settings && isProviderName(settings.provider)) {
    const key = platformKeyFor(settings.provider);
    if (key) {
      return {
        provider: PROVIDERS[settings.provider],
        model: settings.model ?? defaultModelFor(settings.provider),
        apiKey: key,
        temperature: settings.temperature,
        source: "tenant",
      };
    }
  }

  // 3. Plan default.
  const plan = await planDefault(tenantId);
  if (plan && isProviderName(plan.provider)) {
    const key = platformKeyFor(plan.provider);
    if (key) {
      return {
        provider: PROVIDERS[plan.provider],
        model: plan.model ?? defaultModelFor(plan.provider),
        apiKey: key,
        temperature: settings?.temperature ?? null,
        source: "plan",
      };
    }
  }

  // 4. Platform default.
  const envProvider = process.env.LLM_DEFAULT_PROVIDER;
  if (isProviderName(envProvider)) {
    const key = platformKeyFor(envProvider);
    if (key) {
      return {
        provider: PROVIDERS[envProvider],
        model: process.env.LLM_DEFAULT_MODEL ?? defaultModelFor(envProvider),
        apiKey: key,
        temperature: settings?.temperature ?? null,
        source: "platform",
      };
    }
  }

  throw new Error(`No LLM provider configured for tenant ${tenantId}`);
}

export function defaultModelFor(provider: ProviderName): string {
  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "anthropic":
      return "claude-haiku-4-5-20251001";
    case "gemini":
      return "gemini-2.0-flash";
  }
}
