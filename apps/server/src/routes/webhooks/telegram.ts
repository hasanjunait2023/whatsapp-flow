import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import { TELEGRAM_WEBHOOK_SECRET, IS_PRODUCTION } from "../../lib/env.js";
import { consumeLinkCode, sendTelegramMessage } from "../../services/telegram.js";

/**
 * POST /api/telegram/webhook — Telegram Bot API updates. Mounted OUTSIDE the
 * tenant middleware (machine caller); authenticated by the secret token header
 * Telegram echoes back (set via setWebhook secret_token). Fail-closed: when a
 * secret is configured, unsigned requests are rejected.
 *
 * v1 scope: only /start <link_code> (chat binding). Everything else is ignored
 * with a polite hint — the CEO agent is one-way reporting for now.
 */
export const telegramWebhookRoute = new Hono();

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
}

function secretValid(header: string | undefined): boolean {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    // Fail closed in production: an unconfigured secret must reject every
    // request (mirrors the WAHA HMAC-enforced posture). Dev/test, where no
    // secret is set, stays open for local webhook exercising.
    return !IS_PRODUCTION;
  }
  if (!header) return false;
  const a = Buffer.from(TELEGRAM_WEBHOOK_SECRET);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

telegramWebhookRoute.post("/", async (c) => {
  if (!secretValid(c.req.header("x-telegram-bot-api-secret-token"))) {
    return c.json({ error: "Invalid secret token" }, 401);
  }

  let update: TelegramUpdate;
  try {
    update = (await c.req.json()) as TelegramUpdate;
  } catch {
    return c.json({ ok: true }); // never make Telegram retry on garbage
  }

  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) {
    return c.json({ ok: true });
  }

  let reply: string | null = null;
  const startMatch = text.match(/^\/start\s+([0-9a-f]{32})$/i);
  if (startMatch) {
    reply = consumeLinkCode(startMatch[1], String(chatId)).reply;
  } else if (text.startsWith("/start")) {
    reply = "Open your dashboard and use the Telegram link button to connect this chat.";
  }

  if (reply) {
    try {
      await sendTelegramMessage(String(chatId), reply);
    } catch {
      // Reply failures must not make Telegram re-deliver the update.
    }
  }
  return c.json({ ok: true });
});
