import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
// Courier secrets are encrypted at rest; encryptSecret needs a 32-byte key.
process.env.MASTER_KEY = "0".repeat(64);

const { sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { COURIER_HANDLERS } = await import("../src/routes/courier-fns.js");

const TENANT_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const TENANT_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ctx = (tenantId: string) => ({ userId: "u", tenantId, isAdmin: false }) as any;

beforeAll(() => {
  runMigrations();
  for (const t of [TENANT_A, TENANT_B]) {
    sqlite.prepare("INSERT INTO tenants (id, name, owner_id) VALUES (?, ?, 'u')").run(t, t);
  }
  sqlite
    .prepare("INSERT INTO orders (id, order_number, tenant_id) VALUES ('order-a', 'A-001', ?)")
    .run(TENANT_A);
});

afterEach(() => vi.unstubAllGlobals());

describe("courier-save-integration (BYOK, encrypted at rest)", () => {
  it("stores the api_key encrypted, not in plaintext", async () => {
    const res = await COURIER_HANDLERS["courier-save-integration"](
      { provider: "steadfast", api_key: "PLAINKEY", api_secret: "PLAINSECRET", is_active: true },
      ctx(TENANT_A),
    );
    expect(res.error).toBeNull();
    const row = sqlite
      .prepare("SELECT api_key, api_secret FROM courier_integrations WHERE tenant_id = ? AND provider = 'steadfast'")
      .get(TENANT_A) as { api_key: string; api_secret: string };
    expect(row.api_key).not.toBe("PLAINKEY");
    expect(row.api_secret).not.toBe("PLAINSECRET");
    expect(row.api_key.split(".")).toHaveLength(3); // base64(iv).base64(tag).base64(ct)
  });

  it("preserves the stored secret when api_key is left blank on re-save", async () => {
    const before = sqlite
      .prepare("SELECT api_key FROM courier_integrations WHERE tenant_id = ? AND provider = 'steadfast'")
      .get(TENANT_A) as { api_key: string };
    await COURIER_HANDLERS["courier-save-integration"](
      { provider: "steadfast", api_key: "", api_secret: "", is_active: false },
      ctx(TENANT_A),
    );
    const after = sqlite
      .prepare("SELECT api_key, is_active FROM courier_integrations WHERE tenant_id = ? AND provider = 'steadfast'")
      .get(TENANT_A) as { api_key: string; is_active: number };
    expect(after.api_key).toBe(before.api_key); // unchanged
    expect(after.is_active).toBe(0); // toggle applied
  });
});

describe("bdcourier-check", () => {
  it("fails clearly when BDCourier is not configured", async () => {
    const res = await COURIER_HANDLERS["bdcourier-check"]({ phone: "017" }, ctx(TENANT_B));
    expect(res.data).toBeNull();
    expect(res.error?.message).toMatch(/not configured/i);
  });

  it("returns a parsed success ratio from the gateway", async () => {
    await COURIER_HANDLERS["courier-save-integration"](
      { provider: "bdcourier", api_key: "BDKEY", is_active: true },
      ctx(TENANT_A),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          courierData: {
            summary: { total_parcel: 10, success_parcel: 8, cancelled_parcel: 2 },
            steadfast: { total_parcel: 6, success_parcel: 5, cancelled_parcel: 1 },
          },
        }),
      })),
    );
    const res = await COURIER_HANDLERS["bdcourier-check"]({ phone: "01711111111" }, ctx(TENANT_A));
    expect(res.error).toBeNull();
    const data = res.data as { successRatio: number; totalParcels: number; couriers: unknown[] };
    expect(data.totalParcels).toBe(10);
    expect(data.successRatio).toBeCloseTo(0.8);
    expect(data.couriers.length).toBe(1);
  });
});

describe("courier-book-parcel", () => {
  beforeEach(async () => {
    // Ensure steadfast is active for the happy-path booking.
    await COURIER_HANDLERS["courier-save-integration"](
      { provider: "steadfast", api_key: "KEY", api_secret: "SEC", is_active: true },
      ctx(TENANT_A),
    );
  });

  it("books a Steadfast parcel and records a shipment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: 200,
          consignment: { consignment_id: 99887, tracking_code: "TRK123", status: "in_review" },
        }),
      })),
    );
    const res = await COURIER_HANDLERS["courier-book-parcel"](
      {
        order_id: "order-a",
        courier: "steadfast",
        recipient_name: "Karim",
        recipient_phone: "01700000000",
        recipient_address: "Dhaka",
        cod_amount: 1200,
      },
      ctx(TENANT_A),
    );
    expect(res.error).toBeNull();
    const data = res.data as { success: boolean; tracking_code: string };
    expect(data.success).toBe(true);
    expect(data.tracking_code).toBe("TRK123");
    const ship = sqlite
      .prepare("SELECT consignment_id, courier FROM shipments WHERE order_id = 'order-a' AND tenant_id = ?")
      .get(TENANT_A) as { consignment_id: string; courier: string };
    expect(ship.consignment_id).toBe("99887");
    expect(ship.courier).toBe("steadfast");
  });

  it("gracefully refuses Pathao (not yet supported) without throwing", async () => {
    const res = await COURIER_HANDLERS["courier-book-parcel"](
      { order_id: "order-a", courier: "pathao", recipient_name: "X", recipient_phone: "1", recipient_address: "Y" },
      ctx(TENANT_A),
    );
    expect(res.error?.message).toMatch(/Pathao/i);
  });

  it("rejects booking against another tenant's order", async () => {
    const res = await COURIER_HANDLERS["courier-book-parcel"](
      { order_id: "order-a", courier: "steadfast", recipient_name: "X", recipient_phone: "1", recipient_address: "Y" },
      ctx(TENANT_B),
    );
    expect(res.error?.message).toMatch(/Order not found/i);
  });
});
