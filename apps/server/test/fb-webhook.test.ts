import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { useTempDb } from "./helpers.js";

useTempDb();
process.env.FB_WEBHOOK_VERIFY_TOKEN = "app-level-token";

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, facebookPages } = await import("../src/db/schema.js");
const { fbWebhookRoute } = await import("../src/routes/webhooks/fb.js");
import { Hono } from "hono";

const TENANT_A = "aaaa1111-1111-1111-1111-111111111111";
const APP_SECRET = "page-app-secret";

function sign(body: string): string {
  return "sha256=" + createHmac("sha256", APP_SECRET).update(body).digest("hex");
}

const app = new Hono();
app.route("/api/webhooks/fb", fbWebhookRoute);

beforeAll(() => {
  runMigrations();
  db.insert(tenants).values({ id: TENANT_A, name: "A", owner_id: "u" }).run();
  db.insert(facebookPages)
    .values({
      id: "page-a",
      tenant_id: TENANT_A,
      page_id: "FB-PAGE-1",
      page_name: "Page A",
      page_access_token: "tok",
      app_secret: APP_SECRET,
      webhook_verify_token: "page-level-token",
      status: "disconnected",
    })
    .run();
});

describe("fb webhook verify-token handshake", () => {
  it("echoes the challenge for the app-level token", async () => {
    const res = await app.request(
      "/api/webhooks/fb?hub.mode=subscribe&hub.verify_token=app-level-token&hub.challenge=CHAL1",
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("CHAL1");
  });

  it("echoes the challenge for a matching page-level token and activates the page", async () => {
    const res = await app.request(
      "/api/webhooks/fb?hub.mode=subscribe&hub.verify_token=page-level-token&hub.challenge=CHAL2",
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("CHAL2");
    const page = sqlite.prepare("SELECT status FROM facebook_pages WHERE id = 'page-a'").get() as {
      status: string;
    };
    expect(page.status).toBe("active");
  });

  it("rejects an unknown token when pages exist", async () => {
    const res = await app.request(
      "/api/webhooks/fb?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CHAL3",
    );
    expect(res.status).toBe(403);
  });
});

describe("fb webhook inbound message ingest", () => {
  it("upserts a contact and inserts an inbound message, deduped on mid", async () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "FB-PAGE-1",
          messaging: [
            {
              sender: { id: "PSID-9" },
              recipient: { id: "FB-PAGE-1" },
              timestamp: 1700000000000,
              message: { mid: "m_abc", text: "hello there" },
            },
          ],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const post = () =>
      app.request("/api/webhooks/fb", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-hub-signature-256": sign(raw) },
        body: raw,
      });

    const res1 = await post();
    expect(res1.status).toBe(200);
    const res2 = await post(); // duplicate mid
    expect(res2.status).toBe(200);

    const msgs = sqlite.prepare("SELECT id, content, direction FROM fb_messages WHERE mid = 'm_abc'").all() as Array<{
      content: string;
      direction: string;
    }>;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toBe("hello there");
    expect(msgs[0].direction).toBe("inbound");

    const contact = sqlite.prepare("SELECT unread_count FROM fb_contacts WHERE psid = 'PSID-9'").get() as {
      unread_count: number;
    };
    expect(contact.unread_count).toBe(1);
  });

  it("ignores entries for an unknown page", async () => {
    const payload = {
      object: "page",
      entry: [{ id: "UNKNOWN-PAGE", messaging: [{ sender: { id: "x" }, message: { mid: "m_z", text: "hi" } }] }],
    };
    const raw = JSON.stringify(payload);
    const res = await app.request("/api/webhooks/fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": sign(raw) },
      body: raw,
    });
    expect(res.status).toBe(200);
    const count = sqlite.prepare("SELECT COUNT(*) AS n FROM fb_messages WHERE mid = 'm_z'").get() as { n: number };
    expect(count.n).toBe(0);
  });

  it("fails closed: refuses to ingest a payload with an invalid signature", async () => {
    const payload = {
      object: "page",
      entry: [
        {
          id: "FB-PAGE-1",
          messaging: [{ sender: { id: "PSID-X" }, message: { mid: "m_bad", text: "spoofed" } }],
        },
      ],
    };
    const raw = JSON.stringify(payload);
    const res = await app.request("/api/webhooks/fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": "sha256=deadbeef" },
      body: raw,
    });
    // Webhook always 200s to Meta, but the spoofed message must not be ingested.
    expect(res.status).toBe(200);
    const count = sqlite.prepare("SELECT COUNT(*) AS n FROM fb_messages WHERE mid = 'm_bad'").get() as { n: number };
    expect(count.n).toBe(0);
  });

  it("fails closed: refuses to ingest when the page has no app_secret", async () => {
    // A page with no secret cannot authenticate payloads → no ingest.
    db.insert(facebookPages)
      .values({
        id: "page-nosecret",
        tenant_id: TENANT_A,
        page_id: "FB-PAGE-NOSEC",
        page_name: "No Secret",
        page_access_token: "tok",
        app_secret: null,
        webhook_verify_token: "vt2",
        status: "active",
      })
      .run();
    const payload = {
      object: "page",
      entry: [
        { id: "FB-PAGE-NOSEC", messaging: [{ sender: { id: "PSID-Y" }, message: { mid: "m_nosec", text: "hi" } }] },
      ],
    };
    const raw = JSON.stringify(payload);
    const res = await app.request("/api/webhooks/fb", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-hub-signature-256": sign(raw) },
      body: raw,
    });
    expect(res.status).toBe(200);
    const count = sqlite.prepare("SELECT COUNT(*) AS n FROM fb_messages WHERE mid = 'm_nosec'").get() as { n: number };
    expect(count.n).toBe(0);
  });
});
