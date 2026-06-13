import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dbGet, dbTx } from "../../db/raw.js";
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

/**
 * Additional permissions for the page's linked Instagram Business/Creator
 * account (DMs, comments, publishing). Requested by default; skipped when the
 * customer chooses Facebook-only connect (?instagram=0) — pages without a
 * linked IG account simply connect as Facebook-only either way.
 */
export const IG_OAUTH_SCOPES = [
  "instagram_basic",
  "instagram_manage_messages",
  "instagram_manage_comments",
  "instagram_content_publish",
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
export function buildAuthUrl(state: string, includeInstagram = true): string {
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
    const scopes = includeInstagram ? [...FB_OAUTH_SCOPES, ...IG_OAUTH_SCOPES] : [...FB_OAUTH_SCOPES];
    params.set("scope", scopes.join(","));
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
  /** Linked IG Business/Creator account; absent for Facebook-only pages. */
  instagram_business_account?: {
    id?: string;
    username?: string;
    profile_picture_url?: string;
  };
}

interface AccountsResponse {
  data?: FbUserPage[];
  paging?: { next?: string };
}

/**
 * Lists pages the user manages (page tokens included), following pagination.
 * instagram_business_account is requested alongside; Meta omits it for pages
 * with no linked IG account or when IG permissions were not granted, so
 * Facebook-only connects work identically.
 */
export async function fetchUserPages(userToken: string): Promise<FbUserPage[]> {
  const withIg =
    "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}";
  const fbOnly = "id,name,access_token,picture{url}";
  const fetchAll = async (fields: string): Promise<FbUserPage[]> => {
    const pages: FbUserPage[] = [];
    let url =
      `${GRAPH()}/me/accounts?fields=${encodeURIComponent(fields)}&limit=50` +
      `&access_token=${encodeURIComponent(userToken)}`;
    for (let i = 0; i < MAX_PAGE_FETCH_PAGES && url; i++) {
      const batch = await graphGet<AccountsResponse>(url);
      pages.push(...(batch.data ?? []));
      url = batch.paging?.next ?? "";
    }
    return pages.filter((p) => p.id && p.access_token);
  };
  try {
    return await fetchAll(withIg);
  } catch {
    // IG field can be refused when instagram_basic was not granted —
    // degrade to a Facebook-only page list rather than failing the connect.
    return fetchAll(fbOnly);
  }
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
  ig_username: string | null;
}

export interface UpsertPagesResult {
  connected: ConnectedPage[];
  /** New pages refused because the tenant's plan page cap was reached. */
  skipped: Array<{ page_id: string; page_name: string }>;
  /** Pages with a linked Instagram account among the connected ones. */
  instagramCount: number;
}

/** The tenant's page cap from its active subscription's plan (default 1). */
export async function getTenantPageCap(tenantId: string): Promise<number> {
  const row = await dbGet<{ max: number }>(
    `SELECT COALESCE(p.max_pages, 1) AS max
         FROM subscriptions s JOIN plans p ON p.id = s.plan_id
        WHERE s.tenant_id = ? AND s.status IN ('active','trialing','past_due')
        ORDER BY s.created_at DESC LIMIT 1`,
    tenantId,
  );
  return row?.max ?? 1;
}

/**
 * Upserts the user's pages for the tenant. Reconnects of already-known pages
 * are always applied (token refresh); NEW pages beyond `maxPages` are skipped
 * so the subscription's page cap cannot be bypassed by reconnecting.
 * Instagram link data is only overwritten when present in the payload, so a
 * Facebook-only reconnect never wipes an existing IG link.
 */
export async function upsertConnectedPages(
  tenantId: string,
  pages: FbUserPage[],
  maxPages = Number.POSITIVE_INFINITY,
): Promise<UpsertPagesResult> {
  const now = new Date().toISOString();
  const appSecret = getFbAppSecret();
  const connected: ConnectedPage[] = [];
  const skipped: Array<{ page_id: string; page_name: string }> = [];
  await dbTx(async (tx) => {
    let activeCount = (
      await tx.get<{ n: number }>(
        "SELECT COUNT(*)::int AS n FROM facebook_pages WHERE tenant_id = ? AND status = 'active'",
        tenantId,
      )
    )!.n;
    for (const page of pages) {
      const encrypted = encryptPageToken(page.access_token);
      const pictureUrl = page.picture?.data?.url ?? null;
      const ig = page.instagram_business_account;
      const igId = ig?.id ?? null;
      const igUsername = ig?.username ?? null;
      const igPicture = ig?.profile_picture_url ?? null;
      const existing = await tx.get<{ id: string; status: string; ig_username: string | null }>(
        "SELECT id, status, ig_username FROM facebook_pages WHERE tenant_id = ? AND page_id = ? LIMIT 1",
        tenantId,
        page.id,
      );
      if (existing) {
        await tx.run(
          `UPDATE facebook_pages
             SET page_access_token = ?, page_name = ?, profile_picture_url = COALESCE(?, profile_picture_url),
                 app_secret = ?, status = 'active', last_connected_at = ?, updated_at = ?,
                 ig_account_id = COALESCE(?, ig_account_id),
                 ig_username = COALESCE(?, ig_username),
                 ig_profile_picture_url = COALESCE(?, ig_profile_picture_url),
                 ig_connected_at = CASE WHEN ?::text IS NOT NULL THEN ? ELSE ig_connected_at END
             WHERE id = ?`,
          encrypted,
          page.name,
          pictureUrl,
          appSecret,
          now,
          now,
          igId,
          igUsername,
          igPicture,
          igId,
          now,
          existing.id,
        );
        if (existing.status !== "active") activeCount++;
        connected.push({
          id: existing.id,
          page_id: page.id,
          page_name: page.name,
          ig_username: igUsername ?? existing.ig_username,
        });
      } else {
        if (activeCount >= maxPages) {
          skipped.push({ page_id: page.id, page_name: page.name });
          continue;
        }
        const id = crypto.randomUUID();
        const isFirst = !(await tx.get(
          "SELECT 1 FROM facebook_pages WHERE tenant_id = ? LIMIT 1",
          tenantId,
        ));
        await tx.run(
          `INSERT INTO facebook_pages
               (id, tenant_id, page_id, page_name, page_access_token, profile_picture_url,
                app_secret, status, is_default, webhook_verify_token,
                ig_account_id, ig_username, ig_profile_picture_url, ig_connected_at,
                last_connected_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id,
          tenantId,
          page.id,
          page.name,
          encrypted,
          pictureUrl,
          appSecret,
          isFirst ? true : false,
          crypto.randomUUID().replace(/-/g, ""),
          igId,
          igUsername,
          igPicture,
          igId ? now : null,
          now,
          now,
          now,
        );
        activeCount++;
        connected.push({ id, page_id: page.id, page_name: page.name, ig_username: igUsername });
      }
    }
  });
  const instagramCount = connected.filter((p) => p.ig_username).length;
  return { connected, skipped, instagramCount };
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
