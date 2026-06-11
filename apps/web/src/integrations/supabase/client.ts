// Self-hosted backend shim. Drop-in replacement for the previous supabase-js
// client: same `supabase` surface (from/rpc/functions/auth/channel/storage) so
// the existing call sites keep working unchanged. Requests target the local
// /api backend (Hono) instead of Supabase cloud.
//
// import { supabase } from "@/integrations/supabase/client";

import { QueryBuilder } from "./shim/query-builder";
import { authAdapter } from "./shim/auth";
import { createChannel, removeChannel, type RealtimeChannel } from "./shim/realtime";
import { storage } from "./shim/storage";
import { functions } from "./shim/functions";
import { postJson } from "./shim/http";

function from(table: string): QueryBuilder {
  return new QueryBuilder(table);
}

async function rpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<{ data: T | null; error: { message: string } | null }> {
  return postJson<T>(`/rpc/${fn}`, args ?? {});
}

function channel(name: string): RealtimeChannel {
  return createChannel(name);
}

export const supabase = {
  from,
  rpc,
  functions,
  auth: authAdapter,
  channel,
  removeChannel: (ch: RealtimeChannel) => removeChannel(ch),
  storage,
};

export type SupabaseShim = typeof supabase;
