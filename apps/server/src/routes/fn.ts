import { Hono } from "hono";
import { getTenant } from "../middleware/tenant.js";

export const fnRoute = new Hono();

type FnHandler = (
  body: unknown,
  ctx: { userId: string; tenantId: string | null; isAdmin: boolean },
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Edge-function replacement scaffold: POST /api/fn/:name returns { data, error }.
 * Real functions (send-message, webhooks, etc.) are ported in later phases; for
 * Phase 1 this returns a not-implemented error so callers fail explicitly rather
 * than silently.
 */
const HANDLERS: Record<string, FnHandler> = {};

fnRoute.post("/:name", async (c) => {
  const name = c.req.param("name");
  const handler = HANDLERS[name];
  if (!handler) {
    return c.json(
      { data: null, error: { message: `Function "${name}" not implemented` } },
      501,
    );
  }
  let body: unknown = {};
  try {
    const raw = await c.req.text();
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }
  const ctx = getTenant(c);
  const result = await handler(body, ctx);
  return c.json(result);
});
