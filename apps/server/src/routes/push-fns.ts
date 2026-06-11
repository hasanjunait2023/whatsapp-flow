import { saveSubscription, removeSubscription } from "../services/push.js";
import type { FnContext, FnResult } from "./waha/session.js";

/** Web-push subscription fn handlers, spread into the /api/fn registry. */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

interface SubscriptionBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export const PUSH_HANDLERS: Record<string, FnHandler> = {
  "push-subscribe": async (body, ctx) => {
    if (!ctx.tenantId) return { data: null, error: { message: "No active tenant" } };
    const sub = body as SubscriptionBody;
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return { data: null, error: { message: "Invalid push subscription" } };
    }
    saveSubscription(ctx.tenantId, ctx.userId, {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { data: { success: true }, error: null };
  },

  "push-unsubscribe": async (body, _ctx) => {
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) return { data: null, error: { message: "endpoint is required" } };
    removeSubscription(endpoint);
    return { data: { success: true }, error: null };
  },
};
