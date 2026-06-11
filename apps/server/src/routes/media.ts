import { Hono } from "hono";
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile, unlink, realpath } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "../lib/env.js";
import { getTenant } from "../middleware/tenant.js";

export const mediaRoute = new Hono();

/**
 * Local-disk media storage scaffold (replaces Supabase buckets).
 * Files live under MEDIA_DIR/{tenantId}/... and are tenant-scoped on every op.
 *
 * SECURITY: every path segment that comes from the URL is validated and the
 * resolved location is verified to stay inside a fixed, normalized MEDIA_DIR
 * root (independent of user input), then re-verified after symlink resolution.
 */

/** Tenant ids are uuids/slugs; reject anything that could traverse or escape. */
const TENANT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Fixed containment root, normalized once, independent of any user input. */
const MEDIA_ROOT = path.resolve(MEDIA_DIR);

function isInsideRoot(resolved: string): boolean {
  return resolved === MEDIA_ROOT || resolved.startsWith(MEDIA_ROOT + path.sep);
}

/**
 * Rejects relative paths that contain traversal sequences or encoded separators.
 * Frameworks may leave `%2f`/`%2F`/`%5c` undecoded; treat them — and any literal
 * `..` segment — as hostile rather than relying solely on resolution.
 */
function hasSuspiciousSegments(rel: string): boolean {
  if (/%2f|%2F|%5c|%5C|%2e%2e/i.test(rel)) return true;
  if (rel.includes("\0")) return true;
  const segments = rel.split(/[/\\]/);
  return segments.some((s) => s === "..");
}

/**
 * Resolves a tenant-scoped path under the fixed MEDIA_ROOT and verifies
 * containment. Returns null if the tenant id is invalid, the relative path
 * contains traversal/encoded separators, or the resolved path escapes the root.
 * Does NOT touch the filesystem (use ensureRealpathInside for symlink hardening
 * on read/delete of existing files).
 */
function resolveSafe(tenantId: string, rel: string): string | null {
  if (!TENANT_ID_RE.test(tenantId)) return null;
  if (hasSuspiciousSegments(rel)) return null;
  const resolved = path.resolve(MEDIA_ROOT, tenantId, rel);
  if (!isInsideRoot(resolved)) return null;
  return resolved;
}

/**
 * Re-checks containment after resolving symlinks on an existing path. Defeats
 * symlink-escape: a symlink inside the tenant dir pointing outside MEDIA_ROOT is
 * rejected. Returns the real path if safe, or null otherwise.
 */
async function ensureRealpathInside(dest: string): Promise<string | null> {
  try {
    const real = await realpath(dest);
    return isInsideRoot(real) ? real : null;
  } catch {
    return null;
  }
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
  // Harden against a symlinked target directory escaping the root.
  if (existsSync(dir)) {
    const realDir = await ensureRealpathInside(dir);
    if (!realDir) {
      return c.json({ data: null, error: { message: "Invalid path" } }, 400);
    }
  } else {
    mkdirSync(dir, { recursive: true });
  }
  await writeFile(dest, buf);
  const publicPath = `/api/media/${ctx.tenantId}/${rel}`;
  return c.json({ data: { path: rel, publicUrl: publicPath }, error: null });
});

// GET /api/media/:tenantId/:path — serve (tenant check)
mediaRoute.get("/*", async (c) => {
  const ctx = getTenant(c);
  const rel = c.req.path.replace(/^\/api\/media\//, "");
  const [pathTenant, ...rest] = rel.split("/");
  if (!pathTenant || !TENANT_ID_RE.test(pathTenant)) {
    return c.json({ data: null, error: { message: "Invalid path" } }, 400);
  }
  if (!ctx.isAdmin && pathTenant !== ctx.tenantId) {
    return c.json({ data: null, error: { message: "Forbidden" } }, 403);
  }
  const dest = resolveSafe(pathTenant, rest.join("/"));
  if (!dest || !existsSync(dest)) {
    return c.json({ data: null, error: { message: "Not found" } }, 404);
  }
  const real = await ensureRealpathInside(dest);
  if (!real) {
    return c.json({ data: null, error: { message: "Invalid path" } }, 400);
  }
  const buf = await readFile(real);
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
  if (existsSync(dest)) {
    const real = await ensureRealpathInside(dest);
    if (!real) {
      return c.json({ data: null, error: { message: "Invalid path" } }, 400);
    }
    await unlink(real);
  }
  return c.json({ data: { path: rel }, error: null });
});
