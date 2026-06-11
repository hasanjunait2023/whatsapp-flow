import { describe, it, expect, beforeAll } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants } = await import("../src/db/schema.js");
const { PUSH_HANDLERS } = await import("../src/routes/push-fns.js");
const { saveSubscription } = await import("../src/services/push.js");
import type { FnContext } from "../src/routes/waha/session.js";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const TENANT_B = "bbbb2222-2222-2222-2222-222222222222";
const ENDPOINT = "https://push.example.com/endpoint-A";

function ctx(tenantId: string | null, userId: string): FnContext {
  return { userId, tenantId, isAdmin: false };
}

function endpointCount(endpoint: string): number {
  const row = sqlite
    .prepare(`SELECT COUNT(*) AS n FROM push_subscriptions WHERE endpoint = ?`)
    .get(endpoint) as { n: number };
  return row.n;
}

beforeAll(() => {
  runMigrations();
  db.insert(tenants)
    .values([
      { id: TENANT_A, name: "A", owner_id: "user-a" },
      { id: TENANT_B, name: "B", owner_id: "user-b" },
    ])
    .run();
  saveSubscription(TENANT_A, "user-a", {
    endpoint: ENDPOINT,
    keys: { p256dh: "pub", auth: "auth" },
  });
});

describe("push-unsubscribe authorization", () => {
  it("is a no-op for a different tenant (no cross-tenant delete)", async () => {
    const res = await PUSH_HANDLERS["push-unsubscribe"](
      { endpoint: ENDPOINT },
      ctx(TENANT_B, "user-b"),
    );
    expect(res.error).toBeNull();
    expect(endpointCount(ENDPOINT)).toBe(1); // still there
  });

  it("is a no-op for a different user in the same tenant", async () => {
    await PUSH_HANDLERS["push-unsubscribe"]({ endpoint: ENDPOINT }, ctx(TENANT_A, "user-other"));
    expect(endpointCount(ENDPOINT)).toBe(1);
  });

  it("rejects when there is no active tenant", async () => {
    const res = await PUSH_HANDLERS["push-unsubscribe"]({ endpoint: ENDPOINT }, ctx(null, "user-a"));
    expect(res.error?.message).toBe("No active tenant");
    expect(endpointCount(ENDPOINT)).toBe(1);
  });

  it("removes the subscription for its owner", async () => {
    const res = await PUSH_HANDLERS["push-unsubscribe"](
      { endpoint: ENDPOINT },
      ctx(TENANT_A, "user-a"),
    );
    expect(res.error).toBeNull();
    expect(endpointCount(ENDPOINT)).toBe(0);
  });
});
