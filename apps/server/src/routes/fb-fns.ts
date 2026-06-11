import { sqlite } from "../db/index.js";
import { emitChange } from "../realtime/emitter.js";
import { FB_GRAPH_VERSION } from "../lib/env.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Facebook / Meta Graph module — Messenger send, comment-reply, profile refresh.
 * Ported from supabase/functions/fb-send-message, fb-reply-comment,
 * fb-refresh-profile. Keeps the graph.facebook.com calls verbatim (per plan).
 *
 * page_access_token is read server-side from facebook_pages directly (it is a
 * redactColumns secret and never leaves via /api/query). Response contracts:
 *   fb-send-message  -> { success, message_id, mid, recipient_id }
 *   fb-reply-comment -> { success, comment_id, fb_comment_id }
 *   fb-refresh-profile -> { success, ... }
 */

const ok = (data: unknown): FnResult => ({ data, error: null });
const GRAPH = `https://graph.facebook.com/${FB_GRAPH_VERSION}`;
const RETRYABLE = new Set([1, 2, 4, 17, 341, 368, -1]);

interface FbError {
  message: string;
  type: string;
  code: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWithRetry(
  url: string,
  payload: Record<string, unknown>,
  maxRetries = 3,
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: FbError }> {
  let lastError: FbError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json()) as { error?: FbError; [k: string]: unknown };
      if (res.ok) return { success: true, data: result };
      const fbError: FbError = result.error ?? { message: "Unknown Facebook API error", type: "OAuthException", code: 0 };
      lastError = fbError;
      if (!RETRYABLE.has(fbError.code) || attempt === maxRetries) break;
      await sleep(1000 * 2 ** attempt + Math.random() * 500);
    } catch (err) {
      lastError = { message: err instanceof Error ? err.message : "Network error", type: "NetworkError", code: -1 };
      if (attempt === maxRetries) break;
      await sleep(1000 * 2 ** attempt);
    }
  }
  return { success: false, error: lastError ?? { message: "Unknown error", type: "Unknown", code: 0 } };
}

interface FbContactRow {
  id: string;
  psid: string;
  tenant_id: string;
  page_id: string;
  name: string | null;
  profile_pic_synced_at: string | null;
  page_access_token: string | null;
}

/** Loads a fb_contact joined to its page token, enforcing tenant scope. */
function loadFbContact(contactId: string, ctx: FnContext): FbContactRow | { error: string } {
  const row = sqlite
    .prepare(
      `SELECT c.id, c.psid, c.tenant_id, c.page_id, c.name, c.profile_pic_synced_at,
              p.page_access_token AS page_access_token
       FROM fb_contacts c
       JOIN facebook_pages p ON p.id = c.page_id
       WHERE c.id = ? LIMIT 1`,
    )
    .get(contactId) as FbContactRow | undefined;
  if (!row) return { error: "Contact not found" };
  if (!ctx.isAdmin && row.tenant_id !== ctx.tenantId) return { error: "Access denied" };
  return row;
}

interface FbSendBody {
  contact_id?: string;
  content?: string;
  content_type?: string;
  media_url?: string;
  attachment_id?: string;
  quick_replies?: Array<{ title: string; payload?: string; image_url?: string }>;
}

/** fb-send-message: Messenger Send API with retry + DB row. */
export async function fbSendMessage(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as FbSendBody;
  if (!body.contact_id) return ok({ error: "contact_id is required" });
  const contact = loadFbContact(body.contact_id, ctx);
  if ("error" in contact) return ok({ error: contact.error });
  if (!contact.page_access_token) return ok({ error: "Page not connected" });

  const contentType = body.content_type ?? "text";
  const messagePayload: Record<string, unknown> = {
    recipient: { id: contact.psid },
    messaging_type: "RESPONSE",
  };
  if (contentType === "text") {
    const messageObj: Record<string, unknown> = { text: body.content };
    if (body.quick_replies && body.quick_replies.length > 0) {
      messageObj.quick_replies = body.quick_replies.map((qr) => ({
        content_type: "text",
        title: qr.title.slice(0, 20),
        payload: qr.payload ?? qr.title,
        image_url: qr.image_url,
      }));
    }
    messagePayload.message = messageObj;
  } else if (["image", "video", "audio", "file"].includes(contentType)) {
    messagePayload.message = {
      attachment: {
        type: contentType === "file" ? "file" : contentType,
        payload: body.attachment_id ? { attachment_id: body.attachment_id } : { url: body.media_url, is_reusable: true },
      },
    };
  }

  const messageId = crypto.randomUUID();
  sqlite
    .prepare(
      `INSERT INTO fb_messages
         (id, tenant_id, page_id, contact_id, direction, status, content_type, content,
          media_url, sent_by_user_id, sent_at)
       VALUES (?, ?, ?, ?, 'outbound', 'pending', ?, ?, ?, ?, ?)`,
    )
    .run(
      messageId,
      contact.tenant_id,
      contact.page_id,
      contact.id,
      contentType,
      body.content ?? "",
      body.media_url ?? null,
      ctx.userId ?? null,
      new Date().toISOString(),
    );
  emitChange("fb_messages", contact.tenant_id, { contact_id: contact.id });

  const url = `${GRAPH}/me/messages?access_token=${contact.page_access_token}`;
  const result = await sendWithRetry(url, messagePayload);
  if (!result.success) {
    sqlite
      .prepare("UPDATE fb_messages SET status = 'failed', error_message = ? WHERE id = ?")
      .run(result.error?.message ?? "Unknown error", messageId);
    emitChange("fb_messages", contact.tenant_id, { contact_id: contact.id });
    return ok({ error: result.error?.message ?? "Failed to send message", facebook_error: result.error });
  }
  const fbResult = result.data!;
  sqlite
    .prepare("UPDATE fb_messages SET mid = ?, status = 'sent' WHERE id = ?")
    .run((fbResult.message_id as string) ?? null, messageId);
  emitChange("fb_messages", contact.tenant_id, { contact_id: contact.id });

  return ok({
    success: true,
    message_id: messageId,
    mid: fbResult.message_id,
    recipient_id: fbResult.recipient_id,
  });
}

interface FbReplyBody {
  comment_id?: string;
  message?: string;
  attachment_url?: string;
}

interface FbCommentRow {
  id: string;
  tenant_id: string;
  page_id: string;
  post_id: string;
  fb_comment_id: string;
  fb_page_id: string;
  page_access_token: string | null;
}

/** fb-reply-comment: post a reply to a comment via Graph, store the reply row. */
export async function fbReplyComment(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const body = raw as FbReplyBody;
  if (!body.comment_id || !body.message) return ok({ error: "comment_id and message are required" });

  const comment = sqlite
    .prepare(
      `SELECT c.id, c.tenant_id, c.page_id, c.post_id, c.fb_comment_id,
              p.page_id AS fb_page_id, p.page_access_token AS page_access_token
       FROM fb_post_comments c
       JOIN facebook_pages p ON p.id = c.page_id
       WHERE c.id = ? LIMIT 1`,
    )
    .get(body.comment_id) as FbCommentRow | undefined;
  if (!comment) return ok({ error: "Comment not found" });
  if (!ctx.isAdmin && comment.tenant_id !== ctx.tenantId) return ok({ error: "Access denied" });
  if (!comment.page_access_token) return ok({ error: "Page access token not found" });

  const url = `${GRAPH}/${comment.fb_comment_id}/comments`;
  const payload: Record<string, string> = { message: body.message, access_token: comment.page_access_token };
  if (body.attachment_url) payload.attachment_url = body.attachment_url;

  let fbResult: { id?: string; error?: { message?: string } } = {};
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    fbResult = (await res.json()) as typeof fbResult;
    if (!res.ok) {
      return ok({ error: fbResult.error?.message ?? "Failed to reply to comment", facebook_error: fbResult.error });
    }
  } catch (err) {
    return ok({ error: err instanceof Error ? err.message : "Failed to reply to comment" });
  }

  const newId = crypto.randomUUID();
  sqlite
    .prepare(
      `INSERT INTO fb_post_comments
         (id, tenant_id, page_id, post_id, fb_comment_id, parent_comment_id,
          commenter_fb_id, is_from_page, message, sent_by_user_id, created_time, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)`,
    )
    .run(
      newId,
      comment.tenant_id,
      comment.page_id,
      comment.post_id,
      fbResult.id ?? crypto.randomUUID(),
      comment.id,
      comment.fb_page_id,
      body.message,
      ctx.userId ?? null,
      new Date().toISOString(),
    );
  emitChange("fb_post_comments", comment.tenant_id, { post_id: comment.post_id });

  return ok({ success: true, comment_id: newId, fb_comment_id: fbResult.id });
}

/** fb-refresh-profile: fetch the Messenger user profile from Graph, update the row. */
export async function fbRefreshProfile(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const contactId = raw.contact_id as string | undefined;
  const force = raw.force === true;
  if (!contactId) return ok({ error: "contact_id is required" });
  const contact = loadFbContact(contactId, ctx);
  if ("error" in contact) return ok({ error: contact.error });
  if (contact.profile_pic_synced_at && !force) {
    return ok({ success: true, skipped: true, message: "Profile already synced. Use force=true to refresh." });
  }
  if (!contact.page_access_token) return ok({ error: "Page access token not found" });

  let profile: { name?: string; profile_pic?: string } = {};
  try {
    const url = `${GRAPH}/${contact.psid}?fields=name,profile_pic&access_token=${contact.page_access_token}`;
    const res = await fetch(url);
    profile = (await res.json()) as typeof profile;
  } catch {
    // Graph profile fetch can fail for users with restrictive privacy; not fatal.
    profile = {};
  }

  const now = new Date().toISOString();
  sqlite
    .prepare(
      "UPDATE fb_contacts SET profile_pic_synced_at = ?, name = COALESCE(?, name), profile_pic_url = COALESCE(?, profile_pic_url) WHERE id = ?",
    )
    .run(now, profile.name ?? null, profile.profile_pic ?? null, contact.id);
  emitChange("fb_contacts", contact.tenant_id, { id: contact.id });

  return ok({ success: true, name: profile.name, profile_pic_url: profile.profile_pic });
}

export const FB_HANDLERS = {
  "fb-send-message": fbSendMessage,
  "fb-reply-comment": fbReplyComment,
  "fb-refresh-profile": fbRefreshProfile,
};
