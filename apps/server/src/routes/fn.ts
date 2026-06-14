import { Hono } from "hono";
import { getTenant } from "../middleware/tenant.js";
import { SESSION_HANDLERS, type FnContext, type FnResult } from "./waha/session.js";
import { sendMessage, sendNewMessage } from "./messaging.js";
import { SOUL_HANDLERS } from "./soul-fns.js";
import { HERMES_HANDLERS } from "./hermes-fns.js";
import { BILLING_HANDLERS } from "./billing-fns.js";
import { CEO_HANDLERS } from "./ceo-fns.js";
import { PUSH_HANDLERS } from "./push-fns.js";
import { PAYMENTS_HANDLERS } from "./payments-fns.js";
import { COURIER_HANDLERS } from "./courier-fns.js";
import { INTERNAL_CHAT_HANDLERS } from "./internal-chat-fns.js";
import { WOO_HANDLERS } from "./woocommerce-fns.js";
import { FB_HANDLERS } from "./fb-fns.js";
import { GROUP_HANDLERS } from "./groups-fns.js";
import { TEAM_HANDLERS } from "./team-fns.js";
import { MISC_HANDLERS } from "./misc-fns.js";
import { DEFERRED_HANDLERS } from "./deferred-fns.js";
import { ADMIN_HANDLERS } from "./admin-fns.js";
import { GROWTH_HANDLERS } from "./growth-fns.js";
import { WELCOME_HANDLERS } from "./welcome-fns.js";
import { EXPORT_HANDLERS } from "./export-fns.js";
import { uploadChatMediaJson, uploadChatMediaMultipart } from "./upload-fns.js";
import { captureError } from "../lib/error-tracking.js";

export const fnRoute = new Hono();

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

/**
 * Edge-function replacement: POST /api/fn/:name returns the supabase-shaped
 * { data, error } envelope. The shim unwraps `data`, so send-message's exact
 * contract { success, message_id, wa_message_id, ... } is returned inside `data`.
 *
 * Session-lifecycle functions keep their original Wasender names so the frontend
 * (useInstanceQR) works unchanged. GROUP_HANDLERS provides group-send-message.
 */
const HANDLERS: Record<string, FnHandler> = {
  ...SESSION_HANDLERS,
  ...SOUL_HANDLERS,
  ...HERMES_HANDLERS,
  ...BILLING_HANDLERS,
  ...CEO_HANDLERS,
  ...PUSH_HANDLERS,
  ...PAYMENTS_HANDLERS,
  ...COURIER_HANDLERS,
  ...INTERNAL_CHAT_HANDLERS,
  ...WOO_HANDLERS,
  ...FB_HANDLERS,
  ...GROUP_HANDLERS,
  ...TEAM_HANDLERS,
  ...MISC_HANDLERS,
  ...DEFERRED_HANDLERS,
  ...ADMIN_HANDLERS,
  ...GROWTH_HANDLERS,
  ...WELCOME_HANDLERS,
  ...EXPORT_HANDLERS,
  "send-message": sendMessage,
  "send-new-message": sendNewMessage,
  "upload-chat-media": uploadChatMediaJson,
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
  const tenant = getTenant(c);
  const ctx: FnContext = {
    userId: tenant.userId,
    tenantId: tenant.tenantId,
    isAdmin: tenant.isAdmin,
  };

  // Multipart uploads (upload-chat-media via FormData) bypass JSON parsing.
  const contentType = c.req.header("content-type") ?? "";
  if (name === "upload-chat-media" && contentType.includes("multipart/form-data")) {
    try {
      const form = await c.req.formData();
      return c.json(await uploadChatMediaMultipart(form, ctx));
    } catch {
      return c.json({ data: null, error: { message: "Invalid form data" } }, 400);
    }
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }

  let result: FnResult;
  try {
    result = await handler(body, ctx);
  } catch (err) {
    // A handler threw (not the normal { data, error } failure path). Record it
    // and return a generic 500 — never leak the raw error to the client.
    void captureError(err, {
      source: "backend",
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      url: `/api/fn/${name}`,
      meta: { fn: name },
    });
    return c.json({ data: null, error: { message: "Internal error" } }, 500);
  }

  // Map an explicit FORBIDDEN code to a real 403 (auth contract); everything
  // else keeps the 200 + { data, error } envelope the shim expects.
  if (result?.error?.code === "FORBIDDEN") {
    return c.json(result, 403);
  }
  return c.json(result);
});
