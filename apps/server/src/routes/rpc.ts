import { Hono } from "hono";
import { sqlite } from "../db/index.js";
import { getTenant } from "../middleware/tenant.js";

export const rpcRoute = new Hono();

type RpcHandler = (
  args: Record<string, unknown>,
  ctx: { userId: string; tenantId: string | null; isAdmin: boolean },
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * get_last_messages_for_contacts(p_contact_ids text[])
 *
 * Returns the most recent message per contact id, scoped to the active tenant.
 * Shape derived from the consumer (apps/web/src/hooks/useContacts.tsx) and the
 * generated types: { contact_id, content, content_type, direction }.
 *
 * NOTE: no SQL definition exists in supabase/migrations for this function; the
 * Postgres original used DISTINCT ON (contact_id) ORDER BY created_at DESC.
 * Replicated here with a window function over the messages table.
 */
const getLastMessagesForContacts: RpcHandler = async (args, ctx) => {
  const ids = (args.p_contact_ids as string[]) ?? [];
  if (!Array.isArray(ids) || ids.length === 0) {
    return { data: [], error: null };
  }
  if (!ctx.tenantId && !ctx.isAdmin) {
    return { data: null, error: { message: "No active tenant" } };
  }

  const placeholders = ids.map(() => "?").join(",");
  const params: unknown[] = [...ids];
  let tenantClause = "";
  if (ctx.tenantId) {
    tenantClause = "AND m.tenant_id = ?";
    params.push(ctx.tenantId);
  }

  const prepared = sqlite.prepare(`
    SELECT contact_id, content, content_type, direction
    FROM (
      SELECT
        m.contact_id AS contact_id,
        m.content AS content,
        m.content_type AS content_type,
        m.direction AS direction,
        ROW_NUMBER() OVER (
          PARTITION BY m.contact_id
          ORDER BY m.created_at DESC
        ) AS rn
      FROM messages m
      WHERE m.contact_id IN (${placeholders}) ${tenantClause}
    )
    WHERE rn = 1
  `);
  const data = prepared.all(...params);
  return { data, error: null };
};

const HANDLERS: Record<string, RpcHandler> = {
  get_last_messages_for_contacts: getLastMessagesForContacts,
};

/** POST /api/rpc/:fn — Postgres RPC replacements, supabase-shaped envelope. */
rpcRoute.post("/:fn", async (c) => {
  const fn = c.req.param("fn");
  const handler = HANDLERS[fn];
  if (!handler) {
    return c.json({ data: null, error: { message: `Unknown RPC "${fn}"` } }, 404);
  }
  let args: Record<string, unknown> = {};
  try {
    const raw = await c.req.text();
    args = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }
  const ctx = getTenant(c);
  const result = await handler(args, ctx);
  return c.json(result);
});
