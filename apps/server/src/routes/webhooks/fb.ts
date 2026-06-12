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

/** Upserts the fb_contact for an inbound PSID/IGSID, returns its id. */
function upsertContact(page: PageRow, psid: string, platform: "facebook" | "instagram"): string {
  const existing = sqlite
    .prepare("SELECT id FROM fb_contacts WHERE page_id = ? AND psid = ? LIMIT 1")
    .get(page.id, psid) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  sqlite
    .prepare(
      "INSERT OR IGNORE INTO fb_contacts (id, tenant_id, page_id, psid, platform, last_message_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(id, page.tenant_id, page.id, psid, platform, new Date().toISOString());
  const row = sqlite
    .prepare("SELECT id FROM fb_contacts WHERE page_id = ? AND psid = ? LIMIT 1")
    .get(page.id, psid) as { id: string };
  return row.id;
}

function ingestMessage(page: PageRow, event: FbMessageEvent, platform: "facebook" | "instagram"): void {
  const psid = event.sender?.id;
  const msg = event.message;
  if (!psid || !msg?.mid) return;

  // Dedup on the UNIQUE mid index.
  const dup = sqlite.prepare("SELECT 1 FROM fb_messages WHERE mid = ? LIMIT 1").get(msg.mid);
  if (dup) return;

  const contactId = upsertContact(page, psid, platform);
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

interface IgCommentValue {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
  parent_id?: string;
}

interface WebhookEntry {
  id?: string;
  messaging?: FbMessageEvent[];
  changes?: Array<{ field?: string; value?: IgCommentValue }>;
}

/** Stores an inbound Instagram comment (post stub upserted on demand). */
function ingestIgComment(page: PageRow, igAccountId: string, value: IgCommentValue): void {
  if (!value.id || !value.media?.id) return;
  const dup = sqlite
    .prepare("SELECT 1 FROM fb_post_comments WHERE fb_comment_id = ? LIMIT 1")
    .get(value.id);
  if (dup) return;

  const now = new Date().toISOString();
  const isFromPage = Boolean(value.from?.id && value.from.id === igAccountId);
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO fb_posts (id, tenant_id, page_id, fb_post_id, post_type, created_time)
         VALUES (?, ?, ?, ?, 'instagram', ?)`,
      )
      .run(crypto.randomUUID(), page.tenant_id, page.id, value.media!.id, now);
    const post = sqlite
      .prepare("SELECT id FROM fb_posts WHERE page_id = ? AND fb_post_id = ? LIMIT 1")
      .get(page.id, value.media!.id) as { id: string };
    const parent = value.parent_id
      ? (sqlite
          .prepare("SELECT id FROM fb_post_comments WHERE fb_comment_id = ? LIMIT 1")
          .get(value.parent_id) as { id: string } | undefined)
      : undefined;
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO fb_post_comments
           (id, tenant_id, page_id, post_id, fb_comment_id, parent_comment_id, platform,
            commenter_fb_id, commenter_name, is_from_page, message, created_time, is_read)
         VALUES (?, ?, ?, ?, ?, ?, 'instagram', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        page.tenant_id,
        page.id,
        post.id,
        value.id,
        parent?.id ?? null,
        value.from?.id ?? "unknown",
        value.from?.username ?? null,
        isFromPage ? 1 : 0,
        value.text ?? "",
        now,
        isFromPage ? 1 : 0,
      );
    sqlite
      .prepare(
        `UPDATE fb_posts SET comment_count = comment_count + 1,
                unread_comment_count = unread_comment_count + ?, last_comment_at = ?
         WHERE id = ?`,
      )
      .run(isFromPage ? 0 : 1, now, post.id);
  });
  tx();
  emitChange("fb_post_comments", page.tenant_id, { page_id: page.id });
}

/** POST — inbound events. Responds 200 fast (Meta requires <20s). */
fbWebhookRoute.post("/", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");
  let body: { object?: string; entry?: WebhookEntry[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.text("Bad request", 400);
  }
  const isPage = body.object === "page";
  const isInstagram = body.object === "instagram";
  if (!isPage && !isInstagram) return c.text("EVENT_RECEIVED", 200);

  for (const entry of body.entry ?? []) {
    const entryId = String(entry.id ?? "").trim();
    if (!entryId) continue;
    // page events key on the FB page id; instagram events on the linked IG
    // business account id discovered during OAuth connect.
    const page = sqlite
      .prepare(
        isPage
          ? "SELECT id, tenant_id, app_secret FROM facebook_pages WHERE page_id = ? LIMIT 1"
          : "SELECT id, tenant_id, app_secret FROM facebook_pages WHERE ig_account_id = ? LIMIT 1",
      )
      .get(entryId) as PageRow | undefined;
    if (!page) continue;

    // SECURITY: fail closed. A page with no app_secret cannot have its payloads
    // authenticated, so we refuse to ingest rather than trusting unsigned data.
    // Verify the HMAC over the raw body unconditionally before ingesting.
    if (!page.app_secret) continue;
    if (!verifySignature(page.app_secret, rawBody, signature)) continue;

    const platform = isPage ? "facebook" : "instagram";
    for (const event of entry.messaging ?? []) {
      if (event.sender?.id === entryId) continue; // skip echoes of our own sends
      if (event.message) ingestMessage(page, event, platform);
    }
    if (isInstagram) {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments" && change.value) {
          ingestIgComment(page, entryId, change.value);
        }
      }
    }
  }
  return c.text("EVENT_RECEIVED", 200);
});

/**
 * Startup check: warn when any connected page lacks an app_secret, since those
 * pages' inbound webhooks will be refused (fail-closed) until a secret is set.
 */
export function warnIfFbPagesUnverified(): void {
  try {
    const row = sqlite
      .prepare(
        "SELECT COUNT(*) AS n FROM facebook_pages WHERE (app_secret IS NULL OR app_secret = '') AND status = 'active'",
      )
      .get() as { n: number };
    if (row.n > 0) {
      process.emitWarning(
        `${row.n} active facebook_pages row(s) have no app_secret; their inbound webhooks will be refused until one is set.`,
        { code: "FB_PAGES_UNVERIFIED" },
      );
    }
  } catch {
    // facebook_pages may not exist yet during very early boot; ignore.
  }
}
