import { Hono } from "hono";
import type { QueryRequest } from "@whatsapp-flow/shared";
import { getTenant } from "../middleware/tenant.js";
import { executeQuery } from "./query-exec.js";

export const queryRoute = new Hono();

/**
 * POST /api/query — generic, tenant-scoped data access for the supabase shim.
 * Returns a supabase-shaped { data, error, count } envelope.
 */
queryRoute.post("/", async (c) => {
  let body: QueryRequest;
  try {
    body = (await c.req.json()) as QueryRequest;
  } catch {
    return c.json({ data: null, error: { message: "Invalid JSON body" } }, 400);
  }

  if (!body?.table || !body?.op) {
    return c.json(
      { data: null, error: { message: "Missing table or op" } },
      400,
    );
  }

  const ctx = getTenant(c);
  const result = await executeQuery(body, ctx);
  return c.json(result);
});
