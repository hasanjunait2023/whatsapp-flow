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
