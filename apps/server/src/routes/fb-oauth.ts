import { Hono } from "hono";
import { getTenant } from "../middleware/tenant.js";
import {
  buildAuthUrl,
  exchangeCodeForLongLivedToken,
  fetchUserPages,
  getPageToken,
  isFbConnectConfigured,
  signState,
  subscribePageWebhook,
  upsertConnectedPages,
  verifyState,
} from "../services/facebook/oauth.js";
import { emitChange } from "../realtime/emitter.js";
import { sqlite } from "../db/index.js";

/**
 * Facebook page-connect OAuth routes.
 *
 *   /api/fb/oauth/start    — authed (tenantMiddleware); 302 to the FB dialog.
 *   /api/fb/oauth/callback — public mount; trust comes from the HMAC-signed
 *                            state (binds the flow to tenant+user), not from
 *                            the browser session.
 */

const RESULT_PATH = "/fb-inbox";

export const fbOauthStartRoute = new Hono();

fbOauthStartRoute.get("/", (c) => {
  if (!isFbConnectConfigured()) {
    return c.json({ error: "Facebook connect is not configured (FB_APP_ID / FB_APP_SECRET)" }, 503);
  }
  const tenant = getTenant(c);
  if (!tenant.tenantId) return c.json({ error: "No tenant" }, 403);
  const state = signState(tenant.tenantId, tenant.userId ?? "");
  return c.redirect(buildAuthUrl(state), 302);
});

export const fbOauthCallbackRoute = new Hono();

fbOauthCallbackRoute.get("/", async (c) => {
  const fail = (reason: string) =>
    c.redirect(`${RESULT_PATH}?fb_error=${encodeURIComponent(reason)}`, 302);

  if (!isFbConnectConfigured()) return fail("not_configured");

  // User cancelled or FB returned an error on the dialog.
  if (c.req.query("error")) {
    return fail(c.req.query("error_description") ?? c.req.query("error") ?? "denied");
  }

  const state = c.req.query("state") ?? "";
  const bound = verifyState(state);
  if (!bound) return fail("invalid_state");

  const code = c.req.query("code");
  if (!code) return fail("missing_code");

  try {
    const userToken = await exchangeCodeForLongLivedToken(code);
    const pages = await fetchUserPages(userToken);
    if (pages.length === 0) return fail("no_pages");

    const connected = upsertConnectedPages(bound.tenantId, pages);
    // Subscribe each page to Messenger + feed (posts/comments) webhooks.
    await Promise.all(
      pages.map((p) => subscribePageWebhook(p.id, p.access_token)),
    );
    emitChange("facebook_pages", bound.tenantId, {});
    return c.redirect(`${RESULT_PATH}?fb_connected=${connected.length}`, 302);
  } catch (err) {
    console.error("[fb-oauth] callback failed:", err);
    return fail("exchange_failed");
  }
});

// --- fn-style helpers (registered in fb-fns.ts) -------------------------------

/** Lists the tenant's connected pages with token validity, no secrets. */
export function listConnectedPages(tenantId: string): Array<Record<string, unknown>> {
  const rows = sqlite
    .prepare(
      `SELECT id, page_id, page_name, profile_picture_url, status, is_default,
              last_connected_at, page_access_token
       FROM facebook_pages WHERE tenant_id = ? ORDER BY created_at ASC`,
    )
    .all(tenantId) as Array<Record<string, unknown> & { page_access_token: string | null }>;
  return rows.map(({ page_access_token, ...safe }) => ({
    ...safe,
    has_token: Boolean(getPageToken(page_access_token)),
  }));
}
