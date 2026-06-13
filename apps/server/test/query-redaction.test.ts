import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
const { tenants, whatsappInstances, facebookPages, labels, customerSegments } = await import(
  "../src/db/schema.js"
);
import type { TenantContext } from "../src/middleware/tenant.js";

const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const USER_A = "user-a";

function ctxFor(tenantId: string | null, isAdmin = false): TenantContext {
  return { userId: USER_A, tenantId, isAdmin, isImpersonating: false };
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values([
    { id: TENANT_A, name: "A", owner_id: USER_A },
    { id: TENANT_B, name: "B", owner_id: "user-b" },
  ]);

  await db.insert(whatsappInstances).values([
    {
      id: "inst-a",
      tenant_id: TENANT_A,
      name: "Inst A",
      status: "active",
      phone_number: "111",
      api_key_encrypted: "SECRET_API_KEY",
      webhook_secret: "SECRET_WEBHOOK",
    },
  ]);

  await db.insert(facebookPages).values([
    {
      id: "page-a",
      tenant_id: TENANT_A,
      page_id: "fb-1",
      page_name: "Page A",
      page_access_token: "SECRET_FB_TOKEN",
      app_secret: "SECRET_APP",
      status: "connected",
    },
  ]);

  // Tenant-scoping fixtures for two new module tables.
  await db.insert(labels).values([
    { id: "label-a", tenant_id: TENANT_A, name: "VIP", color: "#fff" },
    { id: "label-b", tenant_id: TENANT_B, name: "Secret-B", color: "#000" },
  ]);
  await db.insert(customerSegments).values([
    { id: "seg-a", tenant_id: TENANT_A, name: "Loyal" },
    { id: "seg-b", tenant_id: TENANT_B, name: "Hidden-B" },
  ]);
});

describe("credential redaction on /api/query", () => {
  it("never returns whatsapp_instances secret columns on select('*')", async () => {
    const res = await executeQuery(
      { table: "whatsapp_instances", op: "select", columns: "*" },
      ctxFor(TENANT_A),
    );
    expect(res.error).toBeNull();
    const rows = res.data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("api_key_encrypted");
    expect(rows[0]).not.toHaveProperty("webhook_secret");
    // Non-secret columns the UI relies on are still present.
    expect(rows[0].status).toBe("active");
    expect(rows[0].phone_number).toBe("111");
  });

  it("strips secret columns even when explicitly requested by name", async () => {
    const res = await executeQuery(
      {
        table: "whatsapp_instances",
        op: "select",
        columns: "id, api_key_encrypted, webhook_secret",
      },
      ctxFor(TENANT_A),
    );
    const rows = res.data as Array<Record<string, unknown>>;
    expect(rows[0]).toHaveProperty("id");
    expect(rows[0]).not.toHaveProperty("api_key_encrypted");
    expect(rows[0]).not.toHaveProperty("webhook_secret");
  });

  it("never returns facebook_pages token/secret columns", async () => {
    const res = await executeQuery(
      { table: "facebook_pages", op: "select", columns: "*" },
      ctxFor(TENANT_A),
    );
    const rows = res.data as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("page_access_token");
    expect(rows[0]).not.toHaveProperty("app_secret");
    expect(rows[0]).not.toHaveProperty("webhook_verify_token");
    expect(rows[0].page_name).toBe("Page A");
  });
});

describe("tenant scoping on new module tables", () => {
  it("labels: returns only the active tenant's rows", async () => {
    const res = await executeQuery({ table: "labels", op: "select", columns: "*" }, ctxFor(TENANT_A));
    const rows = res.data as Array<{ tenant_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows.every((r) => r.tenant_id === TENANT_A)).toBe(true);
  });

  it("labels: rejects a cross-tenant tenant_id filter", async () => {
    const res = await executeQuery(
      {
        table: "labels",
        op: "select",
        filters: [{ column: "tenant_id", operator: "eq", value: TENANT_B }],
      },
      ctxFor(TENANT_A),
    );
    expect(res.error).not.toBeNull();
    expect(res.error?.code).toBe("tenant_mismatch");
  });

  it("customer_segments: never leaks another tenant's rows", async () => {
    const res = await executeQuery(
      { table: "customer_segments", op: "select", columns: "*" },
      ctxFor(TENANT_A),
    );
    const rows = res.data as Array<{ name: string; tenant_id: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Loyal");
    expect(rows.some((r) => r.name === "Hidden-B")).toBe(false);
  });
});

describe("readonly mutability on server-owned module tables", () => {
  it("rejects inserts into stock_movements (RPC-only)", async () => {
    const res = await executeQuery(
      {
        table: "stock_movements",
        op: "insert",
        values: { tenant_id: TENANT_A, product_id: "p", movement_type: "in", quantity: 1, previous_quantity: 0, new_quantity: 1 },
        returning: true,
      },
      ctxFor(TENANT_A),
    );
    expect(res.error?.code).toBe("readonly_table");
  });

  it("rejects non-admin writes to admin-only marketing tables", async () => {
    const res = await executeQuery(
      { table: "admin_marketing_campaigns", op: "insert", values: { name: "x", type: "announcement" }, returning: true },
      ctxFor(TENANT_A, false),
    );
    expect(res.error?.code).toBe("forbidden");
  });
});
