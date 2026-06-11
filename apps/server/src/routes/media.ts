import { Hono } from "hono";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "../lib/env.js";
import { getTenant } from "../middleware/tenant.js";

export const mediaRoute = new Hono();

/**
 * Local-disk media storage scaffold (replaces Supabase buckets).
 * Files live under MEDIA_DIR/{tenantId}/... and are tenant-scoped on every op.
 */

function tenantRoot(tenantId: string): string {
  return path.join(MEDIA_DIR, tenantId);
}

/** Resolve a tenant-relative path safely, rejecting traversal outside the root. */
function resolveSafe(tenantId: string, rel: string): string | null {
  const root = tenantRoot(tenantId);
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    return null;
  }
  return resolved;
}

// POST /api/media/:path  — upload (authed, tenant-scoped)
mediaRoute.post("/*", async (c) => {
  const ctx = getTenant(c);
  if (!ctx.tenantId) {
    return c.json({ data: null, error: { message: "No active tenant" } }, 400);
  }
  const rel = c.req.path.replace(/^\/api\/media\//, "");
  const dest = resolveSafe(ctx.tenantId, rel);
  if (!dest) {
    return c.json({ data: null, error: { message: "Invalid path" } }, 400);
  }
  const buf = Buffer.from(await c.req.arrayBuffer());
  const dir = path.dirname(dest);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(dest, buf);
  const publicPath = `/api/media/${ctx.tenantId}/${rel}`;
  return c.json({ data: { path: rel, publicUrl: publicPath }, error: null });
});

// GET /api/media/:tenantId/:path — serve (tenant check)
mediaRoute.get("/*", async (c) => {
  const ctx = getTenant(c);
  const rel = c.req.path.replace(/^\/api\/media\//, "");
  const [pathTenant, ...rest] = rel.split("/");
  if (!ctx.isAdmin && pathTenant !== ctx.tenantId) {
    return c.json({ data: null, error: { message: "Forbidden" } }, 403);
  }
  const dest = resolveSafe(pathTenant, rest.join("/"));
  if (!dest || !existsSync(dest)) {
    return c.json({ data: null, error: { message: "Not found" } }, 404);
  }
  const buf = await readFile(dest);
  return c.body(buf);
});

// DELETE /api/media/:path — remove (authed, tenant-scoped)
mediaRoute.delete("/*", async (c) => {
  const ctx = getTenant(c);
  if (!ctx.tenantId) {
    return c.json({ data: null, error: { message: "No active tenant" } }, 400);
  }
  const rel = c.req.path.replace(/^\/api\/media\//, "");
  const dest = resolveSafe(ctx.tenantId, rel);
  if (!dest) {
    return c.json({ data: null, error: { message: "Invalid path" } }, 400);
  }
  if (existsSync(dest)) await unlink(dest);
  return c.json({ data: { path: rel }, error: null });
});
