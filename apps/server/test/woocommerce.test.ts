import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import { useTempDb } from "./helpers.js";

// Make the SSRF guard's DNS resolution hermetic: every host resolves to a
// public address so tests don't depend on real DNS (the guard logic itself is
// covered separately in woocommerce-ssrf.test.ts).
vi.mock("node:dns/promises", () => ({
  lookup: async () => [{ address: "93.184.216.34", family: 4 }],
}));

useTempDb();
process.env.MASTER_KEY = "0".repeat(64);

const { dbGet, dbAll, dbRun } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { WOO_HANDLERS } = await import("../src/routes/woocommerce-fns.js");

const TENANT = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ctx = () => ({ userId: "u", tenantId: TENANT, isAdmin: false }) as any;

beforeAll(async () => {
  await runMigrations();
  await dbRun("INSERT INTO tenants (id, name, owner_id) VALUES (?, 'T', 'o')", TENANT);
});

afterEach(() => vi.unstubAllGlobals());

function mockFetch(handler: (url: string) => { ok: boolean; status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const r = handler(String(url));
      return { ok: r.ok, status: r.status, json: async () => r.body };
    }),
  );
}

describe("woocommerce-save-integration", () => {
  it("verifies + stores credentials encrypted", async () => {
    mockFetch(() => ({ ok: true, status: 200, body: [] })); // verifyCreds returns []
    const res = await WOO_HANDLERS["woocommerce-save-integration"](
      { store_url: "https://shop.example.com", consumer_key: "ck_live", consumer_secret: "cs_live", is_active: true },
      ctx(),
    );
    expect(res.error).toBeNull();
    const row = (await dbGet(
      "SELECT store_url, consumer_key_encrypted FROM woocommerce_integrations WHERE tenant_id = ?",
      TENANT,
    )) as { store_url: string; consumer_key_encrypted: string };
    expect(row.store_url).toBe("https://shop.example.com");
    expect(row.consumer_key_encrypted).not.toBe("ck_live");
    expect(row.consumer_key_encrypted.split(".")).toHaveLength(3); // encrypted
  });

  it("rejects credentials the store refuses", async () => {
    mockFetch(() => ({ ok: false, status: 401, body: { message: "consumer key invalid" } }));
    const res = await WOO_HANDLERS["woocommerce-save-integration"](
      { store_url: "https://bad.example.com", consumer_key: "x", consumer_secret: "y" },
      ctx(),
    );
    expect(res.error?.message).toMatch(/invalid|auth|connect/i);
  });
});

describe("woocommerce-sync", () => {
  it("pulls products into the local catalog", async () => {
    // First ensure an active integration exists (creds verified via mock).
    mockFetch(() => ({ ok: true, status: 200, body: [] }));
    await WOO_HANDLERS["woocommerce-save-integration"](
      { store_url: "https://shop.example.com", consumer_key: "ck", consumer_secret: "cs", is_active: true },
      ctx(),
    );

    mockFetch((url) => {
      if (url.includes("page=1")) {
        return {
          ok: true,
          status: 200,
          body: [
            { id: 11, name: "Widget", sku: "W1", price: "19.99", regular_price: "19.99", description: "d", status: "publish", stock_quantity: 7, images: [{ src: "http://img/1.jpg" }] },
            { id: 12, name: "Gadget", sku: "G1", price: "5", regular_price: "5", description: "", status: "draft", stock_quantity: 0, images: [] },
          ],
        };
      }
      return { ok: true, status: 200, body: [] }; // page 2 empty -> stop
    });

    const res = await WOO_HANDLERS["woocommerce-sync"]({}, ctx());
    expect(res.error).toBeNull();
    expect((res.data as { productsSynced: number }).productsSynced).toBe(2);

    const products = (await dbAll(
      "SELECT name, price, woo_product_id, is_active FROM products WHERE tenant_id = ? ORDER BY woo_product_id",
      TENANT,
    )) as Array<{ name: string; price: number; woo_product_id: number; is_active: boolean }>;
    expect(products.length).toBe(2);
    expect(products[0]).toMatchObject({ name: "Widget", price: 19.99, woo_product_id: 11, is_active: true });
    expect(products[1].is_active).toBe(false); // draft -> inactive

    // Re-sync updates in place (no duplicate rows).
    await WOO_HANDLERS["woocommerce-sync"]({}, ctx());
    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM products WHERE tenant_id = ?",
      TENANT,
    )) as { n: number };
    expect(count.n).toBe(2);

    const log = (await dbGet(
      "SELECT status, products_synced FROM woocommerce_sync_logs ORDER BY started_at DESC LIMIT 1",
    )) as { status: string; products_synced: number };
    expect(log.status).toBe("completed");
  });
});
