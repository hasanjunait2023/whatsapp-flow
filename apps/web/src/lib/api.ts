/**
 * Thin helper for the dedicated REST endpoints (/api/llm-settings,
 * /api/admin/billing/*) that live outside the supabase shim. Mirrors the
 * shim's conventions: same-origin /api base, cookie credentials, and a
 * { data, error } envelope (error is a plain string on these routes).
 */

export interface RestResult<T> {
  data: T | null;
  error: string | null;
}

export async function apiRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<RestResult<T>> {
  try {
    const res = await fetch(`/api${path}`, {
      method: options?.method ?? "GET",
      credentials: "include",
      headers: options?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const json = (await res.json().catch(() => null)) as
      | { data?: T; error?: string | null }
      | null;
    if (!res.ok || (json && json.error)) {
      return { data: null, error: json?.error ?? `Request failed (${res.status})` };
    }
    return { data: (json?.data ?? null) as T | null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}
