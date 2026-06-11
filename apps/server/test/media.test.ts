import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { useTempDb } from "./helpers.js";

useTempDb();

// Point MEDIA_DIR at a throwaway directory BEFORE importing the route/env.
const MEDIA_DIR = mkdtempSync(path.join(tmpdir(), "wf-media-"));
process.env.MEDIA_DIR = MEDIA_DIR;
// A secret file OUTSIDE the media root that traversal/symlink must never reach.
const OUTSIDE_DIR = mkdtempSync(path.join(tmpdir(), "wf-outside-"));
const SECRET_PATH = path.join(OUTSIDE_DIR, "secret.txt");
writeFileSync(SECRET_PATH, "TOP SECRET");

const { mediaRoute } = await import("../src/routes/media.js");
import { Hono } from "hono";

const TENANT_A = "aaaa-1111";
const TENANT_B = "bbbb-2222";

// Helper to build an app with an injected tenant context.
function appFor(tenantId: string | null, isAdmin = false) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("tenant", { userId: "u", tenantId, isAdmin, isImpersonating: false });
    await next();
  });
  app.route("/api/media", mediaRoute);
  return app;
}

beforeAll(() => {
  // Seed a real, in-root file for tenant A.
  const tenantDir = path.join(MEDIA_DIR, TENANT_A);
  mkdirSync(tenantDir, { recursive: true });
  writeFileSync(path.join(tenantDir, "hello.txt"), "hi from A");
});

afterAll(() => {
  rmSync(MEDIA_DIR, { recursive: true, force: true });
  rmSync(OUTSIDE_DIR, { recursive: true, force: true });
});

describe("media path traversal hardening", () => {
  it("serves a valid in-root file for the owning tenant", async () => {
    const res = await appFor(TENANT_A).request(`/api/media/${TENANT_A}/hello.txt`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hi from A");
  });

  it("serves a valid file for an admin regardless of active tenant", async () => {
    const res = await appFor(TENANT_B, true).request(`/api/media/${TENANT_A}/hello.txt`);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hi from A");
  });

  it("rejects a ../ traversal in the GET path", async () => {
    // Encoded so the path segment is literally "..".
    const res = await appFor(TENANT_A).request(
      `/api/media/${TENANT_A}/..%2f..%2f..%2fsecret.txt`,
    );
    // Either an invalid-path 400 or a not-found 404 — never the secret contents.
    expect([400, 404]).toContain(res.status);
    const body = await res.text();
    expect(body).not.toContain("TOP SECRET");
  });

  it("rejects an invalid tenant segment (path-like) in GET", async () => {
    const res = await appFor(TENANT_A, true).request("/api/media/..%2f..%2fetc/passwd");
    expect([400, 404, 403]).toContain(res.status);
  });

  it("rejects an absolute-path style tenant segment", async () => {
    const res = await appFor(TENANT_A, true).request("/api/media/%2Fetc%2Fpasswd");
    expect([400, 404]).toContain(res.status);
  });

  it("rejects cross-tenant GET for a non-admin", async () => {
    const res = await appFor(TENANT_B).request(`/api/media/${TENANT_A}/hello.txt`);
    expect(res.status).toBe(403);
  });

  it("defeats a symlink that escapes the media root", async () => {
    // Create a symlink inside tenant A's dir that points to the outside secret.
    const linkPath = path.join(MEDIA_DIR, TENANT_A, "escape.txt");
    let symlinkCreated = false;
    try {
      symlinkSync(SECRET_PATH, linkPath);
      symlinkCreated = existsSync(linkPath);
    } catch {
      symlinkCreated = false; // symlink may be unavailable on this platform/CI
    }
    if (!symlinkCreated) {
      return; // skip if the OS won't let us create symlinks
    }
    const res = await appFor(TENANT_A).request(`/api/media/${TENANT_A}/escape.txt`);
    expect([400, 404]).toContain(res.status);
    const body = await res.text();
    expect(body).not.toContain("TOP SECRET");
  });

  it("rejects a ../ traversal on upload", async () => {
    const res = await appFor(TENANT_A).request(`/api/media/..%2f..%2fpwned.txt`, {
      method: "POST",
      body: "owned",
    });
    expect(res.status).toBe(400);
    // The file must not have been written outside the root.
    expect(existsSync(path.join(OUTSIDE_DIR, "pwned.txt"))).toBe(false);
  });
});
