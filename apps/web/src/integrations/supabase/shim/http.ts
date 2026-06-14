/**
 * Thin fetch wrapper for the self-hosted backend. Same-origin in production;
 * proxied via Vite (/api) in development. Credentials are included so the
 * better-auth session cookie travels with every request.
 */

// `data` is intentionally `any`: the call sites were written against
// supabase-js's generated row types and freely access columns, spread, and
// iterate over results. Keeping the envelope loose preserves drop-in type
// compatibility without touching any of those call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiEnvelope<T = any> {
  data: T;
  // `details`/`hint` mirror PostgrestError so call sites that read them keep
  // type-checking against the shim.
  error: { message: string; code?: string; details?: string; hint?: string } | null;
  count?: number | null;
}

const API_BASE = "/api";
const LOGIN_PATH = "/auth/login";

// ---------------------------------------------------------------------------
// 401 choke-point. Every API call funnels through `postJson`, so a single
// handler here clears auth state and redirects to login for ALL requests.
// useAuth registers a callback (via setUnauthorizedHandler) so the React user
// object clears alongside the redirect.
// ---------------------------------------------------------------------------

let unauthorizedHandler: (() => void) | null = null;

/** Registered by useAuth so a 401 can clear the in-memory session. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

/** True when we are already on the login page (avoids redirect loops). */
function onLoginPage(): boolean {
  return window.location.pathname.startsWith(LOGIN_PATH);
}

/** Auth endpoints are allowed to return 401 without triggering a redirect. */
function isAuthRequest(pathname: string): boolean {
  return pathname.startsWith("/auth");
}

let redirecting = false;

function handleUnauthorized(): void {
  if (redirecting || onLoginPage()) return;
  redirecting = true;
  try {
    unauthorizedHandler?.();
  } catch {
    /* never let cleanup throw block the redirect */
  }
  // Full navigation clears all in-memory state and remounts cleanly.
  window.location.assign(LOGIN_PATH);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function postJson<T = any>(
  pathname: string,
  body: unknown,
): Promise<ApiEnvelope<T>> {
  try {
    const res = await fetch(`${API_BASE}${pathname}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });

    // Session expired / not authenticated: clear state and bounce to login.
    // Skip for the auth endpoints themselves (they legitimately 401 on bad
    // credentials) and when already on the login page.
    if (res.status === 401 && !isAuthRequest(pathname)) {
      handleUnauthorized();
      return {
        data: null,
        error: { message: "Session expired", code: "401" },
      };
    }

    const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (json && typeof json === "object" && "data" in json) {
      return json;
    }
    return {
      data: null,
      error: { message: `Request failed (${res.status})` },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { data: null, error: { message } };
  }
}

export { API_BASE };
