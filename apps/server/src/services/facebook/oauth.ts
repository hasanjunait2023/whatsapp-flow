import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sqlite } from "../../db/index.js";
import { encryptSecret, decryptSecret } from "../../lib/crypto.js";
import {
  FB_GRAPH_VERSION,
  IS_PRODUCTION,
  getFbAppId,
  getFbAppSecret,
  getFbLoginConfigId,
  getFbOauthRedirectUrl,
} from "../../lib/env.js";

/**
 * Facebook Login page-connect flow (server-side OAuth redirect, no JS SDK).
 *
 *   GET /api/fb/oauth/start    -> 302 to facebook.com/dialog/oauth (signed state)
 *   GET /api/fb/oauth/callback -> code -> long-lived user token -> /me/accounts
 *                                 -> upsert facebook_pages -> subscribe webhook
 *
 * State is HMAC-signed with FB_APP_SECRET (stateless CSRF protection binding
 * the callback to the tenant/user that started the flow). Page tokens are
 * stored AES-encrypted via lib/crypto; getPageToken() transparently decrypts
 * and passes legacy plaintext rows through unchanged.
 */

const GRAPH = () => `https://graph.facebook.com/${FB_GRAPH_VERSION}`;
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGE_FETCH_PAGES = 5;

/**
 * Permissions requested from the page admin. Covers Messenger inbox plus
 * Facebook post + comment management (publish posts, read/reply/moderate
 * comments) and webhook subscription management.
 */
export const FB_OAUTH_SCOPES = [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",
  "pages_manage_engagement",
  "pages_manage_posts",
] as const;

export function isFbConnectConfigured(): boolean {
  return Boolean(getFbAppId() && getFbAppSecret());
}

// --- signed state ------------------------------------------------------------

function stateHmac(payload: string): string {
  return createHmac("sha256", getFbAppSecret()).update(payload).digest("base64url");
}

/** Builds a signed, expiring state token bound to the tenant + user. */
export function signState(tenantId: string, userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ t: tenantId, u: userId, e: Date.now() + STATE_TTL_MS, n: randomBytes(8).toString("hex") }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${stateHmac(payload)}`;
}

/** Verifies signature + expiry; returns the bound tenant/user or null. */
export function verifyState(state: string): { tenantId: string; userId: string } | null {
  const dot = state.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = stateHmac(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      t?: string;
      u?: string;
      e?: number;
    };
    if (!decoded.t || !decoded.u || typeof decoded.e !== "number") return null;
    if (Date.now() > decoded.e) return null;
    return { tenantId: decoded.t, userId: decoded.u };
  } catch {
    return null;
  }
}

// --- auth dialog URL ----------------------------------------------------------

/** Facebook OAuth dialog URL; uses FB_LOGIN_CONFIG_ID when set, else scopes. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getFbAppId(),
    redirect_uri: getFbOauthRedirectUrl(),
    state,
    response_type: "code",
  });
  const configId = getFbLoginConfigId();
  if (configId) {
    params.set("config_id", configId);
  } else {
    params.set("scope", FB_OAUTH_SCOPES.join(","));
  }
  return `https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

// --- token exchange -----------------------------------------------------------

interface TokenResponse {
  access_token?: string;
  error?: { message?: string };
}

async function graphGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `Graph API request failed (${res.status})`);
  }
  return json;
}

/** code -> short-lived user token -> long-lived user token (~60 days). */
export async function exchangeCodeForLongLivedToken(code: string): Promise<string> {
  const short = await graphGet<TokenResponse>(
    `${GRAPH()}/oauth/access_token?client_id=${encodeURIComponent(getFbAppId())}` +
      `&redirect_uri=${encodeURIComponent(getFbOauthRedirectUrl())}` +
      `&client_secret=${encodeURIComponent(getFbAppSecret())}` +
      `&code=${encodeURIComponent(code)}`,
  );
  if (!short.access_token) throw new Error("Facebook did not return an access token");
  const long = await graphGet<TokenResponse>(
    `${GRAPH()}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(getFbAppId())}` +
      `&client_secret=${encodeURIComponent(getFbAppSecret())}` +
      `&fb_exchange_token=${encodeURIComponent(short.access_token)}`,
  );
  // Long-lived exchange failing is not fatal — fall back to the short token.
  return long.access_token ?? short.access_token;
}

// --- page list ----------------------------------------------------------------

export interface FbUserPage {
  id: string;
  name: string;
  access_token: string;
  picture?: { data?: { url?: string } };
}

interface AccountsResponse {
  data?: FbUserPage[];
  paging?: { next?: string };
}

/** Lists pages the user manages (page tokens included), following pagination. */
export async function fetchUserPages(userToken: string): Promise<FbUserPage[]> {
  const pages: FbUserPage[] = [];
  let url =
    `${GRAPH()}/me/accounts?fields=id,name,access_token,picture{url}&limit=50` +
    `&access_token=${encodeURIComponent(userToken)}`;
  for (let i = 0; i < MAX_PAGE_FETCH_PAGES && url; i++) {
    const batch = await graphGet<AccountsResponse>(url);
    pages.push(...(batch.data ?? []));
    url = batch.paging?.next ?? "";
  }
  return pages.filter((p) => p.id && p.access_token);
}

// --- token storage ------------------------------------------------------------

const ENCRYPTED_RE = /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/;

/** Encrypts a page token; in non-production, falls back to plaintext when MASTER_KEY is unset. */
export function encryptPageToken(token: string): string {
  try {
    return encryptSecret(token);
  } catch (err) {
    if (IS_PRODUCTION) throw err;
    console.warn("[fb-oauth] MASTER_KEY unset — storing page token in plaintext (dev only)");
    return token;
  }
}

/** Decrypts a stored page token; legacy plaintext rows pass through unchanged. */
export function getPageToken(stored: string | null): string | null {
  if (!stored) return stored;
  if (!ENCRYPTED_RE.test(stored)) return stored;
  try {
    return decryptSecret(stored);
  } catch {
    // Matched the shape but isn't ours (e.g. a raw token with two dots).
    return stored;
  }
}

// --- persistence --------------------------------------------------------------

export interface ConnectedPage {
  id: string;
  page_id: string;
  page_name: string;
}

/** Upserts the user's pages for the tenant; returns the affected rows. */
export function upsertConnectedPages(tenantId: string, pages: FbUserPage[]): ConnectedPage[] {
  const now = new Date().toISOString();
  const appSecret = getFbAppSecret();
  const results: ConnectedPage[] = [];
  const upsert = sqlite.transaction(() => {
    for (const page of pages) {
      const encrypted = encryptPageToken(page.access_token);
      const pictureUrl = page.picture?.data?.url ?? null;
      const existing = sqlite
        .prepare("SELECT id FROM facebook_pages WHERE tenant_id = ? AND page_id = ? LIMIT 1")
        .get(tenantId, page.id) as { id: string } | undefined;
      if (existing) {
        sqlite
          .prepare(
            `UPDATE facebook_pages
             SET page_access_token = ?, page_name = ?, profile_picture_url = COALESCE(?, profile_picture_url),
                 app_secret = ?, status = 'active', last_connected_at = ?, updated_at = ?
             WHERE id = ?`,
          )
          .run(encrypted, page.name, pictureUrl, appSecret, now, now, existing.id);
        results.push({ id: existing.id, page_id: page.id, page_name: page.name });
      } else {
        const id = crypto.randomUUID();
        const isFirst = !sqlite
          .prepare("SELECT 1 FROM facebook_pages WHERE tenant_id = ? LIMIT 1")
          .get(tenantId);
        sqlite
          .prepare(
            `INSERT INTO facebook_pages
               (id, tenant_id, page_id, page_name, page_access_token, profile_picture_url,
                app_secret, status, is_default, webhook_verify_token, last_connected_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
          )
          .run(
            id,
            tenantId,
            page.id,
            page.name,
            encrypted,
            pictureUrl,
            appSecret,
            isFirst ? 1 : 0,
            crypto.randomUUID().replace(/-/g, ""),
            now,
            now,
            now,
          );
        results.push({ id, page_id: page.id, page_name: page.name });
      }
    }
  });
  upsert();
  return results;
}

// --- webhook subscription -------------------------------------------------------

/**
 * Subscribes the app to the page's webhook events (Messenger + feed, i.e.
 * posts/comments). Failure is non-fatal: the page stays connected, ingest and
 * outbound send still work, only inbound events are missing until retried.
 */
export async function subscribePageWebhook(pageId: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${GRAPH()}/${encodeURIComponent(pageId)}/subscribed_apps` +
        `?subscribed_fields=messages,messaging_postbacks,feed` +
        `&access_token=${encodeURIComponent(pageToken)}`,
      { method: "POST" },
    );
    const json = (await res.json()) as { success?: boolean; error?: { message?: string } };
    if (!res.ok || !json.success) {
      console.warn(`[fb-oauth] webhook subscribe failed for page ${pageId}: ${json.error?.message ?? res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[fb-oauth] webhook subscribe failed for page ${pageId}:`, err);
    return false;
  }
}
