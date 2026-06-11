// Self-hosted backend shim. Drop-in replacement for the previous supabase-js
// client: same `supabase` surface (from/rpc/functions/auth/channel/storage) so
// the existing call sites keep working unchanged. Requests target the local
// /api backend (Hono) instead of Supabase cloud.
//
// import { supabase } from "@/integrations/supabase/client";

import { QueryBuilder } from "./shim/query-builder";
import { authAdapter } from "./shim/auth";
import { createChannel, removeChannel } from "./shim/realtime";
import { storage } from "./shim/storage";
import { functions } from "./shim/functions";
import { postJson } from "./shim/http";

function from(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpc<T = any>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: T; error: { message: string } | null }> {
  return postJson<T>(`/rpc/${fn}`, args ?? {});
}

// Typed as `any` at the boundary so the returned channel stays assignable to
// the supabase-js `RealtimeChannel` type that some hooks still import directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function channel(name: string): any {
  return createChannel(name);
}

export const supabase = {
  from,
  rpc,
  functions,
  auth: authAdapter,
  channel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  removeChannel: (ch: any) => removeChannel(ch),
  storage,
};

export type SupabaseShim = typeof supabase;
