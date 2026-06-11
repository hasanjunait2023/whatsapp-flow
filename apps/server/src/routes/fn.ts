import { Hono } from "hono";
import { getTenant } from "../middleware/tenant.js";
import { SESSION_HANDLERS, type FnContext, type FnResult } from "./waha/session.js";
import { sendMessage, sendNewMessage, groupSendMessage } from "./messaging.js";
import { SOUL_HANDLERS } from "./soul-fns.js";
import { HERMES_HANDLERS } from "./hermes-fns.js";

export const fnRoute = new Hono();

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

/**
 * Edge-function replacement: POST /api/fn/:name returns the supabase-shaped
 * { data, error } envelope. The shim unwraps `data`, so send-message's exact
 * contract { success, message_id, wa_message_id, ... } is returned inside `data`.
 *
 * Session-lifecycle functions keep their original Wasender names so the frontend
 * (useInstanceQR) works unchanged.
 */
const HANDLERS: Record<string, FnHandler> = {
  ...SESSION_HANDLERS,
  ...SOUL_HANDLERS,
  ...HERMES_HANDLERS,
  "send-message": sendMessage,
  "send-new-message": sendNewMessage,
  "group-send-message": groupSendMessage,
};

fnRoute.post("/:name", async (c) => {
  const name = c.req.param("name");
  const handler = HANDLERS[name];
  if (!handler) {
    return c.json(
      { data: null, error: { message: `Function "${name}" not implemented` } },
      501,
    );
  }
  let body: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }
  const tenant = getTenant(c);
  const ctx: FnContext = {
    userId: tenant.userId,
    tenantId: tenant.tenantId,
    isAdmin: tenant.isAdmin,
  };
  const result = await handler(body, ctx);
  return c.json(result);
});
