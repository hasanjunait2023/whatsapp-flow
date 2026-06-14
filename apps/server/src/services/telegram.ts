import { randomBytes } from "node:crypto";
import { dbGet, dbAll, dbRun } from "../db/raw.js";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME } from "../lib/env.js";

/**
 * Telegram integration on ONE platform bot. Tenants link their chat via a
 * single-use, TTL'd deep-link code (t.me/<bot>?start=<code>); the webhook
 * binds chat_id -> tenant on /start. Reports go out with sendTelegramMessage.
 */

const LINK_CODE_TTL_MS = 15 * 60 * 1000;
const API_BASE = "https://api.telegram.org";

export class TelegramNotConfiguredError extends Error {
  constructor() {
    super("Telegram bot is not configured (TELEGRAM_BOT_TOKEN missing)");
  }
}

/**
 * Escapes the special characters of Telegram's legacy "Markdown" parse mode so
 * that AI/caller-supplied text (post summaries, artifact types) cannot break out
 * of the message and inject formatting or unbalanced entities. The legacy mode
 * treats `_ * ` [` as control chars; we backslash-escape each. Use this on every
 * dynamic string interpolated into a parse_mode:"Markdown" message.
 */
export function escapeTelegramMarkdown(text: string): string {
  return text.replace(/[_*`[]/g, (ch) => `\\${ch}`);
}

async function botApi(method: string, payload: Record<string, unknown>): Promise<unknown> {
  if (!TELEGRAM_BOT_TOKEN) throw new TelegramNotConfiguredError();
  const res = await fetch(`${API_BASE}/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: unknown };
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
  }
  return data.result;
}

export async function sendTelegramMessage(chatId: string, markdown: string): Promise<void> {
  await botApi("sendMessage", {
    chat_id: chatId,
    text: markdown,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

/**
 * Sends an approval card with inline Approve/Reject buttons. The callback_data
 * encodes the approval id (`apv:<uuid>` / `rej:<uuid>`, ≤ 64 bytes), which the
 * webhook decodes on a button tap. Returns the message id so the caller can
 * later edit the card into a decision confirmation.
 */
export async function sendTelegramApprovalCard(
  chatId: string,
  markdown: string,
  approvalId: string,
): Promise<{ message_id: number }> {
  const result = (await botApi("sendMessage", {
    chat_id: chatId,
    text: markdown,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `apv:${approvalId}` },
          { text: "❌ Reject", callback_data: `rej:${approvalId}` },
        ],
      ],
    },
  })) as { message_id: number };
  return { message_id: result.message_id };
}

/** Replaces the text of an existing message (used to confirm a decision). */
export async function editTelegramMessage(
  chatId: string,
  messageId: number | string,
  markdown: string,
): Promise<void> {
  await botApi("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: markdown,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

/** Acknowledges a button tap so Telegram stops showing the loading spinner. */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  await botApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

export interface LinkStart {
  link_code: string;
  deep_link: string;
  expires_at: string;
}

/** Creates (or refreshes) a pending link code for the tenant owner. */
export async function startTelegramLink(tenantId: string, userId: string): Promise<LinkStart> {
  if (!TELEGRAM_BOT_USERNAME) {
    throw new Error("Telegram bot is not configured (TELEGRAM_BOT_USERNAME missing)");
  }
  const code = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString();

  // One pending code per tenant+user: refresh rather than accumulate.
  await dbRun(
    `DELETE FROM telegram_links WHERE tenant_id = ? AND user_id = ? AND status = 'pending'`,
    tenantId,
    userId,
  );
  await dbRun(
    `INSERT INTO telegram_links (id, tenant_id, user_id, link_code, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    crypto.randomUUID(),
    tenantId,
    userId,
    code,
    expiresAt,
  );

  return {
    link_code: code,
    deep_link: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
    expires_at: expiresAt,
  };
}

export interface LinkResult {
  linked: boolean;
  tenantId?: string;
  reply: string;
}

/** Consumes a /start link code from the webhook. Single-use, TTL-enforced. */
export async function consumeLinkCode(code: string, chatId: string): Promise<LinkResult> {
  const row = (await dbGet(
    `SELECT id, tenant_id, expires_at, status FROM telegram_links WHERE link_code = ? LIMIT 1`,
    code,
  )) as
    | { id: string; tenant_id: string; expires_at: string; status: string }
    | undefined;

  if (!row || row.status !== "pending") {
    return { linked: false, reply: "This link is invalid or was already used. Generate a new one from the dashboard." };
  }
  if (row.expires_at < new Date().toISOString()) {
    await dbRun(`UPDATE telegram_links SET status = 'expired' WHERE id = ?`, row.id);
    return { linked: false, reply: "This link has expired. Generate a new one from the dashboard." };
  }

  await dbRun(
    `UPDATE telegram_links SET status = 'linked', chat_id = ?, linked_at = ? WHERE id = ?`,
    chatId,
    new Date().toISOString(),
    row.id,
  );
  return {
    linked: true,
    tenantId: row.tenant_id,
    reply: "✅ Connected! Your CEO agent will send business updates and reports here.",
  };
}

export async function unlinkTelegram(tenantId: string, userId: string): Promise<void> {
  await dbRun(
    `DELETE FROM telegram_links WHERE tenant_id = ? AND user_id = ?`,
    tenantId,
    userId,
  );
}

/** All linked chat ids for a tenant (owner may link multiple devices). */
export async function linkedChatIds(tenantId: string): Promise<string[]> {
  const rows = (await dbAll(
    `SELECT chat_id FROM telegram_links WHERE tenant_id = ? AND status = 'linked' AND chat_id IS NOT NULL`,
    tenantId,
  )) as Array<{ chat_id: string }>;
  return rows.map((r) => r.chat_id);
}

export async function linkStatus(
  tenantId: string,
  userId: string,
): Promise<{ linked: boolean; pending: boolean }> {
  const rows = (await dbAll(
    `SELECT status FROM telegram_links WHERE tenant_id = ? AND user_id = ?`,
    tenantId,
    userId,
  )) as Array<{ status: string }>;
  return {
    linked: rows.some((r) => r.status === "linked"),
    pending: rows.some((r) => r.status === "pending"),
  };
}
