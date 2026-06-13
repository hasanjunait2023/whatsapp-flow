import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { useTempDb } from "./helpers.js";

useTempDb();

// Enforce HMAC verification BEFORE the env/webhook modules are imported so the
// module-level WAHA_WEBHOOK_HMAC_ENFORCED gate is on for this file.
const HMAC_SECRET = "test-webhook-hmac-secret";
process.env.WAHA_WEBHOOK_HMAC_SECRET = HMAC_SECRET;

const { db } = await import("../src/db/index.js");
const { dbGet } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { wahaWebhookRoute } = await import("../src/routes/waha/webhook.js");
const { tenants, whatsappInstances } = await import("../src/db/schema.js");

const TENANT = "hhhh1111-1111-1111-1111-111111111111";
const INSTANCE = "hinst222-2222-2222-2222-222222222222";

const app = new Hono();
app.route("/webhook", wahaWebhookRoute);

function payload() {
  return JSON.stringify({
    event: "message",
    session: "default",
    payload: { id: "wamid-hmac", timestamp: 1700000000, from: "1@c.us", fromMe: false, body: "hi" },
  });
}

function post(body: string, signature?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== undefined) headers["x-webhook-hmac"] = signature;
  return app.request(`/webhook/${INSTANCE}`, { method: "POST", headers, body });
}

beforeAll(async () => {
  await runMigrations();
  await db.insert(tenants).values({ id: TENANT, name: "H", owner_id: "u" });
  await db
    .insert(whatsappInstances)
    .values({ id: INSTANCE, tenant_id: TENANT, name: "WA", status: "active", session_id: "default" });
});

describe("WAHA webhook HMAC enforcement (secret set)", () => {
  it("rejects a request with NO signature (fail-closed, not fail-open)", async () => {
    const res = await post(payload());
    expect(res.status).toBe(401);
    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM messages WHERE wa_message_id = ?",
      "wamid-hmac",
    )) as { n: number };
    expect(count.n).toBe(0);
  });

  it("rejects a request with an INVALID signature", async () => {
    const res = await post(payload(), "deadbeef");
    expect(res.status).toBe(401);
  });

  it("accepts and ingests a request with a VALID signature", async () => {
    const body = payload();
    const sig = createHmac("sha512", HMAC_SECRET).update(body).digest("hex");
    const res = await post(body, sig);
    expect(res.status).toBe(200);
    const count = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM messages WHERE wa_message_id = ?",
      "wamid-hmac",
    )) as { n: number };
    expect(count.n).toBe(1);
  });
});
