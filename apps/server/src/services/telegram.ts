import { randomBytes } from "node:crypto";
import { sqlite } from "../db/index.js";
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

export interface LinkStart {
  link_code: string;
  deep_link: string;
  expires_at: string;
}

/** Creates (or refreshes) a pending link code for the tenant owner. */
export function startTelegramLink(tenantId: string, userId: string): LinkStart {
  if (!TELEGRAM_BOT_USERNAME) {
    throw new Error("Telegram bot is not configured (TELEGRAM_BOT_USERNAME missing)");
  }
  const code = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS).toISOString();

  // One pending code per tenant+user: refresh rather than accumulate.
  sqlite
    .prepare(`DELETE FROM telegram_links WHERE tenant_id = ? AND user_id = ? AND status = 'pending'`)
    .run(tenantId, userId);
  sqlite
    .prepare(
      `INSERT INTO telegram_links (id, tenant_id, user_id, link_code, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .run(crypto.randomUUID(), tenantId, userId, code, expiresAt);

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
export function consumeLinkCode(code: string, chatId: string): LinkResult {
  const row = sqlite
    .prepare(
      `SELECT id, tenant_id, expires_at, status FROM telegram_links WHERE link_code = ? LIMIT 1`,
    )
    .get(code) as
    | { id: string; tenant_id: string; expires_at: string; status: string }
    | undefined;

  if (!row || row.status !== "pending") {
    return { linked: false, reply: "This link is invalid or was already used. Generate a new one from the dashboard." };
  }
  if (row.expires_at < new Date().toISOString()) {
    sqlite.prepare(`UPDATE telegram_links SET status = 'expired' WHERE id = ?`).run(row.id);
    return { linked: false, reply: "This link has expired. Generate a new one from the dashboard." };
  }

  sqlite
    .prepare(`UPDATE telegram_links SET status = 'linked', chat_id = ?, linked_at = ? WHERE id = ?`)
    .run(chatId, new Date().toISOString(), row.id);
  return {
    linked: true,
    tenantId: row.tenant_id,
    reply: "✅ Connected! Your CEO agent will send business updates and reports here.",
  };
}

export function unlinkTelegram(tenantId: string, userId: string): void {
  sqlite
    .prepare(`DELETE FROM telegram_links WHERE tenant_id = ? AND user_id = ?`)
    .run(tenantId, userId);
}

/** All linked chat ids for a tenant (owner may link multiple devices). */
export function linkedChatIds(tenantId: string): string[] {
  const rows = sqlite
    .prepare(
      `SELECT chat_id FROM telegram_links WHERE tenant_id = ? AND status = 'linked' AND chat_id IS NOT NULL`,
    )
    .all(tenantId) as Array<{ chat_id: string }>;
  return rows.map((r) => r.chat_id);
}

export function linkStatus(tenantId: string, userId: string): { linked: boolean; pending: boolean } {
  const rows = sqlite
    .prepare(`SELECT status FROM telegram_links WHERE tenant_id = ? AND user_id = ?`)
    .all(tenantId, userId) as Array<{ status: string }>;
  return {
    linked: rows.some((r) => r.status === "linked"),
    pending: rows.some((r) => r.status === "pending"),
  };
}
