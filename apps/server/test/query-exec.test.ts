import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

// Imported after env is set so the db singleton opens the temp file.
const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
const { tenants, contacts } = await import("../src/db/schema.js");
import type { TenantContext } from "../src/middleware/tenant.js";

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "user-a";

function ctxFor(tenantId: string | null, isAdmin = false): TenantContext {
  return { userId: USER_A, tenantId, isAdmin, isImpersonating: false };
}

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values([
    { id: TENANT_A, name: "Tenant A", owner_id: USER_A },
    { id: TENANT_B, name: "Tenant B", owner_id: "user-b" },
  ]).run();

  db.insert(contacts).values([
    { tenant_id: TENANT_A, wa_id: "a1@s", phone_number: "111", name: "A One" },
    { tenant_id: TENANT_A, wa_id: "a2@s", phone_number: "112", name: "A Two" },
    { tenant_id: TENANT_B, wa_id: "b1@s", phone_number: "221", name: "B One" },
  ]).run();
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
