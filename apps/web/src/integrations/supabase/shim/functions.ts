/**
 * supabase-js functions shim. `invoke(name, { body })` POSTs to /api/fn/{name}
 * and returns the { data, error } envelope unchanged. Edge functions are ported
 * server-side in later phases; until then unknown functions return an error.
 */

interface InvokeOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

export const functions = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async invoke<T = any>(
    name: string,
    options?: InvokeOptions,
  ): Promise<{ data: T | null; error: Error | null }> {
    try {
      const res = await fetch(`/api/fn/${name}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
        body: JSON.stringify(options?.body ?? {}),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: T;
        error?: { message: string };
      } | null;
      if (!res.ok || json?.error) {
        return { data: null, error: new Error(json?.error?.message ?? "Function error") };
      }
      return { data: (json?.data ?? null) as T | null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  },
};
