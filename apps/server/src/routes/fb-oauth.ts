import { Hono } from "hono";
import { getTenant } from "../middleware/tenant.js";
import {
  buildAuthUrl,
  exchangeCodeForLongLivedToken,
  fetchUserPages,
  getPageToken,
  getTenantPageCap,
  isFbConnectConfigured,
  signState,
  subscribePageWebhook,
  upsertConnectedPages,
  verifyState,
} from "../services/facebook/oauth.js";
import { emitChange } from "../realtime/emitter.js";
import { dbAll } from "../db/raw.js";

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
  // ?instagram=0 -> Facebook-only connect (IG permissions not requested at all),
  // for customers without an Instagram account. Default requests both platforms.
  const includeInstagram = c.req.query("instagram") !== "0";
  const state = signState(tenant.tenantId, tenant.userId ?? "");
  return c.redirect(buildAuthUrl(state, includeInstagram), 302);
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

    // Plan cap: reconnects always allowed, NEW pages beyond max_pages skipped.
    const cap = await getTenantPageCap(bound.tenantId);
    const result = await upsertConnectedPages(bound.tenantId, pages, cap);
    if (result.connected.length === 0) return fail("page_limit_reached");

    // Subscribe only the pages that were actually connected.
    const connectedIds = new Set(result.connected.map((p) => p.page_id));
    await Promise.all(
      pages
        .filter((p) => connectedIds.has(p.id))
        .map((p) => subscribePageWebhook(p.id, p.access_token)),
    );
    emitChange("facebook_pages", bound.tenantId, {});

    const params = new URLSearchParams({ fb_connected: String(result.connected.length) });
    if (result.instagramCount > 0) params.set("ig_connected", String(result.instagramCount));
    if (result.skipped.length > 0) params.set("fb_skipped", String(result.skipped.length));
    return c.redirect(`${RESULT_PATH}?${params.toString()}`, 302);
  } catch (err) {
    console.error("[fb-oauth] callback failed:", err);
    return fail("exchange_failed");
  }
});

// --- fn-style helpers (registered in fb-fns.ts) -------------------------------

/** Lists the tenant's connected pages with token validity, no secrets. */
export async function listConnectedPages(tenantId: string): Promise<Array<Record<string, unknown>>> {
  const rows = (await dbAll(
    `SELECT id, page_id, page_name, profile_picture_url, status, is_default,
              ig_account_id, ig_username, ig_profile_picture_url, ig_connected_at,
              last_connected_at, page_access_token
       FROM facebook_pages WHERE tenant_id = ? ORDER BY created_at ASC`,
    tenantId,
  )) as Array<Record<string, unknown> & { page_access_token: string | null }>;
  return rows.map(({ page_access_token, ...safe }) => ({
    ...safe,
    has_instagram: Boolean(safe.ig_account_id),
    has_token: Boolean(getPageToken(page_access_token)),
  }));
}
