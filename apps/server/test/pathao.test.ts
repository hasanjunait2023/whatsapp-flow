import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.MASTER_KEY = "0".repeat(64);

const { sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { COURIER_HANDLERS } = await import("../src/routes/courier-fns.js");

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ctx = () => ({ userId: "u", tenantId: TENANT, isAdmin: false }) as any;

beforeAll(() => {
  runMigrations();
  sqlite.prepare("INSERT INTO tenants (id, name, owner_id) VALUES (?, 'T', 'o')").run(TENANT);
  sqlite.prepare("INSERT INTO orders (id, order_number, tenant_id) VALUES ('order-p', 'P-1', ?)").run(TENANT);
});

afterEach(() => vi.unstubAllGlobals());

describe("Pathao courier (OAuth + booking)", () => {
  it("stores username + an ENCRYPTED password (not plaintext) in settings", async () => {
    await COURIER_HANDLERS["courier-save-integration"](
      {
        provider: "pathao",
        api_key: "client-id",
        api_secret: "client-secret",
        store_id: "999",
        is_active: true,
        settings: { username: "merchant@example.com", password: "s3cret" },
      },
      ctx(),
    );
    const row = sqlite
      .prepare("SELECT settings FROM courier_integrations WHERE tenant_id = ? AND provider = 'pathao'")
      .get(TENANT) as { settings: string };
    const s = JSON.parse(row.settings);
    expect(s.username).toBe("merchant@example.com");
    expect(s.password).toBeUndefined(); // never stored plaintext
    expect(typeof s.password_enc).toBe("string");
    expect(s.password_enc.split(".")).toHaveLength(3); // encrypted form
  });

  it("issues a token then books a parcel via the Pathao API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("issue-token")) {
          return { ok: true, status: 200, json: async () => ({ access_token: "tok_abc", expires_in: 3600 }) };
        }
        if (String(url).includes("/orders")) {
          return { ok: true, status: 200, json: async () => ({ data: { consignment_id: "DA123456", order_status: "Pending" } }) };
        }
        return { ok: false, status: 404, json: async () => ({ message: "not found" }) };
      }),
    );

    const res = await COURIER_HANDLERS["courier-book-parcel"](
      {
        order_id: "order-p",
        courier: "pathao",
        recipient_name: "Karim",
        recipient_phone: "01700000000",
        recipient_address: "Dhaka",
        recipient_city: 1,
        recipient_zone: 2,
        recipient_area: 3,
        cod_amount: 999,
      },
      ctx(),
    );
    expect(res.error).toBeNull();
    const data = res.data as { success: boolean; consignment_id: string };
    expect(data.success).toBe(true);
    expect(data.consignment_id).toBe("DA123456");

    const ship = sqlite
      .prepare("SELECT courier, consignment_id FROM shipments WHERE order_id = 'order-p' AND tenant_id = ?")
      .get(TENANT) as { courier: string; consignment_id: string };
    expect(ship.courier).toBe("pathao");
    expect(ship.consignment_id).toBe("DA123456");
  });
});
