import { Hono } from "hono";
import { timingSafeEqual } from "node:crypto";
import {
  TELEGRAM_WEBHOOK_SECRET,
  IS_PRODUCTION,
  FOUNDER_TG_USER_ID,
  GROWTH_TELEGRAM_CHAT_ID,
} from "../../lib/env.js";
import { consumeLinkCode, sendTelegramMessage, answerCallbackQuery } from "../../services/telegram.js";
import { decideApproval } from "../../services/growth/approvals.js";

/**
 * POST /api/telegram/webhook — Telegram Bot API updates. Mounted OUTSIDE the
 * tenant middleware (machine caller); authenticated by the secret token header
 * Telegram echoes back (set via setWebhook secret_token). Fail-closed: when a
 * secret is configured, unsigned requests are rejected.
 *
 * Scope: /start <link_code> (chat binding) plus growth-approval button taps
 * (callback_query with `apv:<id>` / `rej:<id>`). Everything else is ignored
 * with a polite hint. Telegram redelivers updates, so the approval path is
 * idempotent (decideApproval guards on status) and never throws back — we
 * always answer 200/ok so Telegram stops retrying.
 */
export const telegramWebhookRoute = new Hono();

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { id?: number | string };
    message?: { chat?: { id?: number | string }; message_id?: number };
  };
}

const CALLBACK_RE = /^(apv|rej):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * FAIL-CLOSED identity gate on top of the webhook secret-token transport gate.
 * The secret proves the request came from Telegram; this proves the *tapper* is
 * the founder. A decision is honored ONLY when at least one positive identity
 * signal matches:
 *   - cb.from.id === FOUNDER_TG_USER_ID (when that env is set), OR
 *   - the message chat is the configured GROWTH_TELEGRAM_CHAT_ID.
 * If NEITHER signal is configured/available, the decision is REJECTED — an empty
 * FOUNDER_TG_USER_ID must never mean "anyone may approve".
 */
function isAuthorizedDecider(cb: NonNullable<TelegramUpdate["callback_query"]>): boolean {
  const fromId = cb.from?.id != null ? String(cb.from.id) : "";
  const chatId = cb.message?.chat?.id != null ? String(cb.message.chat.id) : "";

  const founderMatch = FOUNDER_TG_USER_ID !== "" && fromId === FOUNDER_TG_USER_ID;
  const chatMatch = GROWTH_TELEGRAM_CHAT_ID !== "" && chatId === GROWTH_TELEGRAM_CHAT_ID;

  return founderMatch || chatMatch;
}

/**
 * Handles a growth-approval button tap. Never throws: Telegram must not be made
 * to re-deliver. Fail-closed identity gate — see isAuthorizedDecider.
 */
async function handleCallbackQuery(cb: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
  const data = cb.data ?? "";
  const match = data.match(CALLBACK_RE);
  if (!match) {
    await answerCallbackQuery(cb.id).catch(() => {});
    return;
  }

  if (!isAuthorizedDecider(cb)) {
    await answerCallbackQuery(cb.id, "Not authorized").catch(() => {});
    return;
  }

  const fromId = cb.from?.id != null ? String(cb.from.id) : "";
  const decision = match[1].toLowerCase() === "apv" ? "approve" : "reject";
  const approvalId = match[2];

  try {
    const res = await decideApproval(approvalId, decision, fromId || "telegram");
    const ack = !res.changed
      ? "Already handled"
      : decision === "approve"
        ? "Approved"
        : "Rejected";
    await answerCallbackQuery(cb.id, ack).catch(() => {});
  } catch {
    // The decision did not land (DB error). Tell the founder explicitly so they
    // know to tap again — do not silently swallow on the approve path. Telegram
    // does not re-deliver on a 200, so this ack is the only feedback they get.
    await answerCallbackQuery(cb.id, "Failed — try again").catch(() => {});
  }
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

  // Growth-approval button taps arrive as callback_query updates.
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return c.json({ ok: true });
  }

  const text = update.message?.text?.trim();
  const chatId = update.message?.chat?.id;
  if (!text || chatId == null) {
    return c.json({ ok: true });
  }

  let reply: string | null = null;
  const startMatch = text.match(/^\/start\s+([0-9a-f]{32})$/i);
  if (startMatch) {
    reply = (await consumeLinkCode(startMatch[1], String(chatId))).reply;
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
