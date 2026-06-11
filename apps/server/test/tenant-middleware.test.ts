import { describe, it, expect, beforeAll, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

// Mock better-auth so the middleware can resolve a session without a real cookie.
let sessionUserId: string | null = "user-a";
vi.mock("../src/auth/index.js", () => ({
  auth: {
    api: {
      getSession: async () =>
        sessionUserId ? { user: { id: sessionUserId } } : null,
    },
  },
}));

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenantMiddleware } = await import("../src/middleware/tenant.js");
const { tenants, userRoles, systemRoles } = await import("../src/db/schema.js");
import { Hono } from "hono";

const TENANT_A = "ten-aaaa";
const TENANT_B = "ten-bbbb";

const app = new Hono();
app.use("*", tenantMiddleware);
app.get("/whoami", (c) => c.json(c.get("tenant")));

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: "user-a" },
    { id: TENANT_B, name: "B", owner_id: "user-b" },
  ]).run();
  db.insert(userRoles).values([
    { tenant_id: TENANT_A, user_id: "user-a", role: "owner" },
    { tenant_id: TENANT_B, user_id: "user-b", role: "owner" },
  ]).run();
  db.insert(systemRoles).values({ user_id: "admin-x", role: "admin" }).run();
});

describe("tenantMiddleware enforcement", () => {
  it("401s with no session", async () => {
    sessionUserId = null;
    const res = await app.request("/whoami");
    expect(res.status).toBe(401);
    sessionUserId = "user-a";
  });

  it("resolves the user's own tenant", async () => {
    sessionUserId = "user-a";
    const res = await app.request("/whoami");
    const body = (await res.json()) as { tenantId: string; isAdmin: boolean };
    expect(body.tenantId).toBe(TENANT_A);
    expect(body.isAdmin).toBe(false);
  });

  it("rejects accessing another tenant via x-tenant-id header", async () => {
    sessionUserId = "user-a";
    const res = await app.request("/whoami", {
      headers: { "x-tenant-id": TENANT_B },
    });
    expect(res.status).toBe(403);
  });

  it("rejects impersonation for non-admins", async () => {
    sessionUserId = "user-a";
    const res = await app.request("/whoami", {
      headers: { "x-impersonate-tenant": TENANT_B },
    });
    expect(res.status).toBe(403);
  });

  it("allows admin impersonation of an existing tenant and audit-logs it", async () => {
    sessionUserId = "admin-x";
    const res = await app.request("/whoami", {
      headers: { "x-impersonate-tenant": TENANT_A },
    });
    const body = (await res.json()) as {
      tenantId: string;
      isAdmin: boolean;
      isImpersonating: boolean;
    };
    expect(body.isAdmin).toBe(true);
    expect(body.tenantId).toBe(TENANT_A);
    expect(body.isImpersonating).toBe(true);

    const logs = db.all<{ action: string }>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (await import("drizzle-orm")).sql`SELECT action FROM admin_audit_logs WHERE entity_id = ${TENANT_A}`,
    );
    expect(logs.length).toBeGreaterThan(0);
  });
});
