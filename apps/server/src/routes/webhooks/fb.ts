import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { sqlite } from "../../db/index.js";
import { emitChange } from "../../realtime/emitter.js";
import { FB_WEBHOOK_VERIFY_TOKEN } from "../../lib/env.js";

/**
 * Facebook / Meta Messenger webhook (port of supabase/functions/fb-webhook).
 * No user session: authenticated by the Meta verify-token handshake (GET) and
 * the per-page app_secret HMAC (POST). Mounted at /api/webhooks/fb.
 *
 * Scope ported for v1 FB Inbox: verify handshake + inbound message ingest
 * (upsert fb_contact, insert inbound fb_message, dedup on mid). Delivery/read
 * receipts and comment events are recorded but not fully reconciled in v1.
 */

export const fbWebhookRoute = new Hono();

interface PageRow {
  id: string;
  tenant_id: string;
  app_secret: string | null;
}

/** GET — Meta verification handshake (app-level token, then page-level). */
fbWebhookRoute.get("/", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) {
    return c.text("Bad request", 400);
  }
  if (FB_WEBHOOK_VERIFY_TOKEN && token === FB_WEBHOOK_VERIFY_TOKEN) {
    return c.text(challenge, 200);
  }
  const page = sqlite
    .prepare("SELECT id FROM facebook_pages WHERE webhook_verify_token = ? LIMIT 1")
    .get(token) as { id: string } | undefined;
  if (page) {
    sqlite.prepare("UPDATE facebook_pages SET status = 'active' WHERE id = ?").run(page.id);
    return c.text(challenge, 200);
  }
  // Before any page is connected Meta still needs to verify the app.
  const count = sqlite.prepare("SELECT COUNT(*) AS n FROM facebook_pages").get() as { n: number };
  if (count.n === 0) return c.text(challenge, 200);
  return c.text("Verification failed - token not found", 403);
});

function verifySignature(appSecret: string, rawBody: string, header: string | undefined): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface FbMessageEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; attachments?: Array<{ type?: string; payload?: { url?: string } }> };
}

/** Upserts the fb_contact for an inbound PSID, returns its id. */
function upsertContact(page: PageRow, psid: string): string {
  const existing = sqlite
    .prepare("SELECT id FROM fb_contacts WHERE page_id = ? AND psid = ? LIMIT 1")
    .get(page.id, psid) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT OR IGNORE INTO fb_contacts (id, tenant_id, page_id, psid, last_message_at) VALUES (?, ?, ?, ?, ?)",
    )
    .run(id, page.tenant_id, page.id, psid, new Date().toISOString());
  const row = sqlite
    .prepare("SELECT id FROM fb_contacts WHERE page_id = ? AND psid = ? LIMIT 1")
    .get(page.id, psid) as { id: string };
  return row.id;
}

function ingestMessage(page: PageRow, event: FbMessageEvent): void {
  const psid = event.sender?.id;
  const msg = event.message;
  if (!psid || !msg?.mid) return;

  // Dedup on the UNIQUE mid index.
  const dup = sqlite.prepare("SELECT 1 FROM fb_messages WHERE mid = ? LIMIT 1").get(msg.mid);
  if (dup) return;

  const contactId = upsertContact(page, psid);
  const att = msg.attachments?.[0];
  const contentType = att?.type ?? "text";
  const ts = event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString();

  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO fb_messages
           (id, tenant_id, page_id, contact_id, direction, status, content_type, content,
            media_url, mid, sent_at, text_preview)
         VALUES (?, ?, ?, ?, 'inbound', 'delivered', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        page.tenant_id,
        page.id,
        contactId,
        contentType,
        msg.text ?? null,
        att?.payload?.url ?? null,
        msg.mid,
        ts,
        (msg.text ?? "").slice(0, 100),
      );
    sqlite
      .prepare(
        "UPDATE fb_contacts SET last_message_at = ?, unread_count = unread_count + 1 WHERE id = ?",
      )
      .run(ts, contactId);
  });
  tx();
  emitChange("fb_messages", page.tenant_id, { contact_id: contactId });
  emitChange("fb_contacts", page.tenant_id, { id: contactId });
}

/** POST — inbound events. Responds 200 fast (Meta requires <20s). */
fbWebhookRoute.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  let body: { object?: string; entry?: Array<{ id?: string; messaging?: FbMessageEvent[] }> };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.text("Bad request", 400);
  }
  if (body.object !== "page") return c.text("EVENT_RECEIVED", 200);

  for (const entry of body.entry ?? []) {
    const fbPageId = String(entry.id ?? "").trim();
    if (!fbPageId) continue;
    const page = sqlite
      .prepare("SELECT id, tenant_id, app_secret FROM facebook_pages WHERE page_id = ? LIMIT 1")
      .get(fbPageId) as PageRow | undefined;
    if (!page) continue;
    if (page.app_secret && !verifySignature(page.app_secret, rawBody, signature)) continue;

    for (const event of entry.messaging ?? []) {
      if (event.sender?.id === fbPageId) continue; // skip echoes of our own sends
      if (event.message) ingestMessage(page, event);
    }
  }
  return c.text("EVENT_RECEIVED", 200);
});
