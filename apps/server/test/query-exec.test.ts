import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

// Imported after env is set so the db singleton opens the temp file.
const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
const { tenants, contacts, userRoles } = await import("../src/db/schema.js");
import type { TenantContext } from "../src/middleware/tenant.js";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "user-a";

function ctxFor(tenantId: string | null, isAdmin = false): TenantContext {
  return { userId: USER_A, tenantId, isAdmin, isImpersonating: false };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "Tenant A", owner_id: USER_A },
    { id: TENANT_B, name: "Tenant B", owner_id: "user-b" },
  ]);

  await db.insert(contacts).values([
    { tenant_id: TENANT_A, wa_id: "a1@s", phone_number: "111", name: "A One" },
    { tenant_id: TENANT_A, wa_id: "a2@s", phone_number: "112", name: "A Two" },
    { tenant_id: TENANT_B, wa_id: "b1@s", phone_number: "221", name: "B One" },
  ]);

  await db.insert(userRoles).values([
    { id: "role-a", tenant_id: TENANT_A, user_id: USER_A, role: "agent" },
  ]);
});

describe("executeQuery tenant isolation", () => {
  it("returns only the active tenant's contacts", async () => {
    const res = await executeQuery(
      { table: "contacts", op: "select", columns: "*" },
      ctxFor(TENANT_A),
    );
    expect(res.error).toBeNull();
    expect(Array.isArray(res.data)).toBe(true);
    const rows = res.data as Array<{ name: string; tenant_id: string }>;
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.tenant_id === TENANT_A)).toBe(true);
  });

  it("ignores a client tenant_id filter pointing at another tenant by forcing the active tenant", async () => {
    // Non-admin supplying a mismatched tenant_id eq filter must be rejected.
    const res = await executeQuery(
      {
        table: "contacts",
        op: "select",
        filters: [{ column: "tenant_id", operator: "eq", value: TENANT_B }],
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("tenant_mismatch");
  });

  it("rejects access to a non-allowlisted table", async () => {
    const res = await executeQuery(
      { table: "secret_table", op: "select" },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("table_not_allowed");
  });

  it("forces tenant_id on insert regardless of supplied value", async () => {
    const res = await executeQuery(
      {
        table: "contacts",
        op: "insert",
        values: { tenant_id: TENANT_B, wa_id: "x@s", phone_number: "999", name: "Injected" },
        returning: true,
        single: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.error).toBeNull();
    const row = res.data as { tenant_id: string };
    expect(row.tenant_id).toBe(TENANT_A);
  });

  it("supports single() with no rows returning a PGRST116 error", async () => {
    const res = await executeQuery(
      {
        table: "contacts",
        op: "select",
        filters: [{ column: "wa_id", operator: "eq", value: "nope@s" }],
        single: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("PGRST116");
  });

  it("supports maybeSingle() with no rows returning null data and no error", async () => {
    const res = await executeQuery(
      {
        table: "contacts",
        op: "select",
        filters: [{ column: "wa_id", operator: "eq", value: "nope@s" }],
        maybeSingle: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error).toBeNull();
  });

  it("returns an exact count when requested", async () => {
    const res = await executeQuery(
      { table: "contacts", op: "select", count: "exact" },
      ctxFor(TENANT_A),
    );
    expect(res.count).toBe(3); // 2 seeded + 1 inserted above
  });
});

describe("privilege-escalation guards on role-bearing tables", () => {
  it("lets a non-admin SELECT their own user_roles", async () => {
    const res = await executeQuery(
      { table: "user_roles", op: "select", columns: "*" },
      ctxFor(TENANT_A),
    );
    expect(res.error).toBeNull();
    const rows = res.data as Array<{ user_id: string }>;
    expect(rows.every((r) => r.user_id === USER_A)).toBe(true);
  });

  it("rejects a non-admin INSERT into user_roles (role escalation attempt)", async () => {
    const res = await executeQuery(
      {
        table: "user_roles",
        op: "insert",
        values: { tenant_id: TENANT_A, user_id: USER_A, role: "owner" },
        returning: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("forbidden");
  });

  it("rejects a non-admin UPDATE of their role to owner", async () => {
    const res = await executeQuery(
      {
        table: "user_roles",
        op: "update",
        values: { role: "owner" },
        filters: [{ column: "id", operator: "eq", value: "role-a" }],
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("forbidden");
    // Verify the row was NOT changed.
    const check = await executeQuery(
      {
        table: "user_roles",
        op: "select",
        filters: [{ column: "id", operator: "eq", value: "role-a" }],
        single: true,
      },
      ctxFor(TENANT_A),
    );
    expect((check.data as { role: string }).role).toBe("agent");
  });

  it("rejects a non-admin UPSERT into user_roles", async () => {
    const res = await executeQuery(
      {
        table: "user_roles",
        op: "upsert",
        values: { id: "role-a", tenant_id: TENANT_A, user_id: USER_A, role: "owner" },
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("forbidden");
  });

  it("rejects a non-admin DELETE on user_roles", async () => {
    const res = await executeQuery(
      {
        table: "user_roles",
        op: "delete",
        filters: [{ column: "id", operator: "eq", value: "role-a" }],
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("forbidden");
  });

  it("rejects a non-admin INSERT into system_roles (admin grant attempt)", async () => {
    const res = await executeQuery(
      {
        table: "system_roles",
        op: "insert",
        values: { user_id: USER_A, role: "admin", is_super_admin: true },
      },
      ctxFor(TENANT_A),
    );
    expect(res.data).toBeNull();
    expect(res.error?.code).toBe("forbidden");
  });

  it("allows an admin to INSERT into user_roles", async () => {
    const res = await executeQuery(
      {
        table: "user_roles",
        op: "insert",
        values: { tenant_id: TENANT_B, user_id: "user-b", role: "owner" },
        returning: true,
        single: true,
      },
      ctxFor(TENANT_A, true),
    );
    expect(res.error).toBeNull();
    expect((res.data as { role: string }).role).toBe("owner");
  });
});
