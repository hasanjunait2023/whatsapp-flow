import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { llmSettings } from "../db/schema.js";
import { encryptSecret } from "../lib/crypto.js";
import { getTenant } from "../middleware/tenant.js";

/**
 * Dedicated route for per-tenant LLM settings. This table is intentionally NOT
 * in the generic /api/query allowlist: api_key_encrypted must never leave the
 * server, so GET returns a redacted view and PUT encrypts before storing.
 */
export const llmSettingsRoute = new Hono();

const PROVIDERS = new Set(["openai", "anthropic", "gemini"]);

interface PutBody {
  provider?: string | null;
  model?: string | null;
  api_key?: string | null;
  temperature?: number | null;
  monthly_token_budget?: number | null;
}

function redacted(row: typeof llmSettings.$inferSelect | undefined) {
  if (!row) {
    return {
      provider: null,
      model: null,
      temperature: null,
      monthly_token_budget: null,
      is_byok: false,
      has_api_key: false,
    };
  }
  return {
    provider: row.provider,
    model: row.model,
    temperature: row.temperature,
    monthly_token_budget: row.monthly_token_budget,
    is_byok: row.is_byok,
    has_api_key: row.api_key_encrypted != null,
  };
}

llmSettingsRoute.get("/", (c) => {
  const ctx = getTenant(c);
  if (!ctx.tenantId) {
    return c.json({ error: "No active tenant" }, 400);
  }
  const row = db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.tenant_id, ctx.tenantId))
    .limit(1)
    .all()[0];
  return c.json({ data: redacted(row), error: null });
});

llmSettingsRoute.put("/", async (c) => {
  const ctx = getTenant(c);
  if (!ctx.tenantId) {
    return c.json({ error: "No active tenant" }, 400);
  }

  let body: PutBody;
  try {
    body = (await c.req.json()) as PutBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (body.provider != null && !PROVIDERS.has(body.provider)) {
    return c.json({ error: `Unknown provider "${body.provider}"` }, 400);
  }
  if (
    body.temperature != null &&
    (typeof body.temperature !== "number" || body.temperature < 0 || body.temperature > 2)
  ) {
    return c.json({ error: "temperature must be between 0 and 2" }, 400);
  }
  if (
    body.monthly_token_budget != null &&
    (!Number.isInteger(body.monthly_token_budget) || body.monthly_token_budget < 0)
  ) {
    return c.json({ error: "monthly_token_budget must be a non-negative integer" }, 400);
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("provider" in body) patch.provider = body.provider;
  if ("model" in body) patch.model = body.model;
  if ("temperature" in body) patch.temperature = body.temperature;
  if ("monthly_token_budget" in body) patch.monthly_token_budget = body.monthly_token_budget;
  if ("api_key" in body) {
    patch.api_key_encrypted = body.api_key ? encryptSecret(body.api_key) : null;
    patch.is_byok = Boolean(body.api_key);
  }

  const existing = db
    .select({ id: llmSettings.id })
    .from(llmSettings)
    .where(eq(llmSettings.tenant_id, ctx.tenantId))
    .limit(1)
    .all()[0];

  if (existing) {
    db.update(llmSettings).set(patch).where(eq(llmSettings.id, existing.id)).run();
  } else {
    db.insert(llmSettings)
      .values({ tenant_id: ctx.tenantId, ...patch })
      .run();
  }

  const row = db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.tenant_id, ctx.tenantId))
    .limit(1)
    .all()[0];
  return c.json({ data: redacted(row), error: null });
});
