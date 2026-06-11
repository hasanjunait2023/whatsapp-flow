import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
const { tenants, contacts, businessTypes, customerScores } = await import("../src/db/schema.js");
import type { TenantContext } from "../src/middleware/tenant.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";

function ctx(tenantId: string | null, isAdmin = false): TenantContext {
  return { userId: "u", tenantId, isAdmin, isImpersonating: false };
}

beforeAll(() => {
  runMigrations();
  db.insert(businessTypes).values({ id: "bt-1", slug: "ecommerce", name: "E-commerce" }).run();
  db.insert(tenants)
    .values([
      { id: TENANT_A, name: "A", owner_id: "u", business_type_id: "bt-1" },
      { id: TENANT_B, name: "B", owner_id: "u2" },
    ])
    .run();
  db.insert(contacts)
    .values([
      { id: "ca", tenant_id: TENANT_A, wa_id: "a@s", phone_number: "111" },
      { id: "cb", tenant_id: TENANT_B, wa_id: "b@s", phone_number: "222" },
    ])
    .run();
  db.insert(customerScores)
    .values({ id: "sc-a", tenant_id: TENANT_A, contact_id: "ca", total_orders: 5, total_spent: 1200, score_tier: "gold" })
    .run();
});

describe("contact_customer_status virtual view", () => {
  it("returns rollup data for the active tenant's contacts, scoped by .in()", async () => {
    const res = await executeQuery(
      {
        table: "contact_customer_status",
        op: "select",
        columns: "*",
        filters: [{ column: "contact_id", operator: "in", value: ["ca", "cb"] }],
      },
      ctx(TENANT_A),
    );
    expect(res.error).toBeNull();
    const rows = res.data as Array<{
      contact_id: string;
      business_type: string;
      total_orders: number;
      total_spent: number;
      score_tier: string;
    }>;
    // cb belongs to tenant B and is excluded by the forced tenant scope.
    expect(rows).toHaveLength(1);
    expect(rows[0].contact_id).toBe("ca");
    expect(rows[0].business_type).toBe("ecommerce");
    expect(rows[0].total_orders).toBe(5);
    expect(rows[0].total_spent).toBe(1200);
    expect(rows[0].score_tier).toBe("gold");
  });

  it("rejects a mismatched tenant filter from a non-admin", async () => {
    const res = await executeQuery(
      {
        table: "contact_customer_status",
        op: "select",
        filters: [{ column: "tenant_id", operator: "eq", value: TENANT_B }],
      },
      ctx(TENANT_A),
    );
    expect(res.error?.code).toBe("tenant_mismatch");
  });

  it("is read-only — inserts are rejected", async () => {
    const res = await executeQuery(
      { table: "contact_customer_status", op: "insert", values: { contact_id: "x" }, returning: true },
      ctx(TENANT_A),
    );
    expect(res.error?.code).toBe("readonly_table");
  });
});
