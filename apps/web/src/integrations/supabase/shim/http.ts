/**
 * Thin fetch wrapper for the self-hosted backend. Same-origin in production;
 * proxied via Vite (/api) in development. Credentials are included so the
 * better-auth session cookie travels with every request.
 */

export interface ApiEnvelope<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

const API_BASE = "/api";

export async function postJson<T = unknown>(
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
