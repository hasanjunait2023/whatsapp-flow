import { dbGet, dbRun } from "../../db/raw.js";
import { notify } from "../notify.js";
import { sendPushToTenant } from "../push.js";
import { sendTelegramMessage, escapeTelegramMarkdown, linkedChatIds } from "../telegram.js";
import { wahaClient } from "../../waha/client.js";
import { GROWTH_WHATSAPP_SESSION } from "../../lib/env.js";
import { logger } from "../../lib/logger.js";
import { sendEmail } from "../../lib/email.js";

/**
 * M4 AFTER-SALES channel router. sendOwnerMessage() takes a lifecycle event for a
 * paying tenant (the seller/owner) and dispatches a bilingual touch on THEIR
 * channels, centrally enforcing:
 *   - opt-out (hard stop),
 *   - quiet hours (no 2am pings),
 *   - a weekly frequency cap per owner,
 *   - per-channel consent (owner_channel_prefs booleans).
 *
 * Channel selection follows the event's policy with FALLBACK: the policy lists
 * channels in priority order; the router keeps the consented ones, and (when the
 * policy is fallback-style) sends only the first that succeeds. Owned, zero-cost
 * channels (in_app/push) are always allowed unless the owner turned them off.
 *
 * Each dispatch writes an admin_marketing_sends row (channel enum extended to
 * whatsapp|telegram|email|sms|in_app|push). Email + SMS are STUBBED (no provider
 * keys yet) and recorded as 'pending'.
 *
 * CONSENT: WhatsApp/SMS to the owner require a number on file (the number IS the
 * consent signal, same as M3's warm-only rule); without one the channel is
 * skipped and recorded.
 */

export type OwnerChannel = "in_app" | "push" | "whatsapp" | "telegram" | "email" | "sms";

/**
 * How the router treats the channel list:
 *   - "fallback": try in order, stop after the first DELIVERED channel (used for
 *     a single milestone/celebration so the owner isn't pinged five ways).
 *   - "all": send on every consented channel (used for critical/time-sensitive,
 *     e.g. payment due on sms+whatsapp).
 */
export interface ChannelsPolicy {
  channels: OwnerChannel[];
  mode: "fallback" | "all";
}

export interface OwnerMessageInput {
  event: string;
  title: string;
  bodyEn: string;
  bodyBn: string;
  channelsPolicy: ChannelsPolicy;
  /** Optional deep link surfaced on in-app / push. */
  url?: string;
  /** Links the after-sales enrollment + sequence step for the send row. */
  enrollmentId?: string;
  sequenceStep?: number;
}

export type DispatchOutcome = "sent" | "pending" | "skipped" | "failed";

export interface ChannelResult {
  channel: OwnerChannel;
  outcome: DispatchOutcome;
  reason?: string;
}

export interface OwnerMessageResult {
  delivered: boolean;
  blockedReason?: "opted_out" | "quiet_hours" | "weekly_cap" | "no_consented_channel";
  results: ChannelResult[];
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

interface PrefsRow {
  id: string;
  tenant_id: string;
  preferred_channel: string | null;
  in_app_ok: boolean;
  push_ok: boolean;
  whatsapp_ok: boolean;
  telegram_ok: boolean;
  email: string | null;
  email_ok: boolean;
  sms_number: string | null;
  sms_ok: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  opted_out: boolean;
  weekly_cap: number;
  messages_this_week: number;
  week_reset_at: string | null;
}

interface OwnerContact {
  whatsappNumber: string | null;
  email: string | null;
  telegramChatIds: string[];
}

/**
 * Loads (and lazily creates) the tenant's channel prefs, backfilling owner
 * contact from the tenant owner's profile. A missing prefs row is created with
 * defaults so the first lifecycle touch already has a consent record — never a
 * silent skip because the row didn't exist yet.
 */
export async function resolveOwnerPrefs(tenantId: string): Promise<PrefsRow | null> {
  let row = (await dbGet(
    `SELECT id, tenant_id, preferred_channel, in_app_ok, push_ok, whatsapp_ok, telegram_ok,
            email, email_ok, sms_number, sms_ok, quiet_hours_start, quiet_hours_end,
            opted_out, weekly_cap, messages_this_week, week_reset_at
       FROM owner_channel_prefs WHERE tenant_id = ? LIMIT 1`,
    tenantId,
  )) as PrefsRow | undefined;

  if (!row) {
    const ownerEmail = await ownerEmailForTenant(tenantId);
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO owner_channel_prefs (id, tenant_id, email, created_at, updated_at, week_reset_at)
         VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (tenant_id) DO NOTHING`,
      crypto.randomUUID(),
      tenantId,
      ownerEmail,
      now,
      now,
      now,
    );
    row = (await dbGet(
      `SELECT id, tenant_id, preferred_channel, in_app_ok, push_ok, whatsapp_ok, telegram_ok,
              email, email_ok, sms_number, sms_ok, quiet_hours_start, quiet_hours_end,
              opted_out, weekly_cap, messages_this_week, week_reset_at
         FROM owner_channel_prefs WHERE tenant_id = ? LIMIT 1`,
      tenantId,
    )) as PrefsRow | undefined;
  }
  return row ?? null;
}

/** Owner email from the tenant owner's profile (best-effort; null when absent). */
async function ownerEmailForTenant(tenantId: string): Promise<string | null> {
  const row = (await dbGet(
    `SELECT p.email AS email
       FROM tenants t JOIN profiles p ON p.id = t.owner_id
      WHERE t.id = ? LIMIT 1`,
    tenantId,
  )) as { email: string | null } | undefined;
  return row?.email ?? null;
}

/** Owner WhatsApp number (profile phone) + telegram chats linked for this tenant. */
async function resolveOwnerContact(tenantId: string, prefs: PrefsRow): Promise<OwnerContact> {
  const profile = (await dbGet(
    `SELECT p.phone_number AS phone, p.email AS email
       FROM tenants t JOIN profiles p ON p.id = t.owner_id
      WHERE t.id = ? LIMIT 1`,
    tenantId,
  )) as { phone: string | null; email: string | null } | undefined;

  const telegramChatIds = await linkedChatIds(tenantId);
  return {
    whatsappNumber: profile?.phone ?? null,
    email: prefs.email ?? profile?.email ?? null,
    telegramChatIds,
  };
}

/** Digits-only JID for WAHA, matching the M3 messaging convention. */
function toChatId(whatsappNumber: string): string {
  return `${whatsappNumber.replace(/[^0-9]/g, "")}@c.us`;
}

/**
 * Quiet-hours check in the owner's clock. start/end are hours (0-23). A window
 * that wraps midnight (start > end, e.g. 22->8) is handled. Equal/null start+end
 * disables the check.
 */
export function isWithinQuietHours(now: Date, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  const h = now.getHours();
  if (start < end) return h >= start && h < end; // same-day window
  return h >= start || h < end; // wraps midnight
}

/** Weekly count, treating a window older than 7 days as reset to 0. */
function currentWeeklyCount(prefs: PrefsRow, now: Date): number {
  if (!prefs.week_reset_at) return prefs.messages_this_week ?? 0;
  const age = now.getTime() - new Date(prefs.week_reset_at).getTime();
  if (age >= MS_PER_WEEK) return 0;
  return prefs.messages_this_week ?? 0;
}

/** Records one delivered touch against the rolling weekly window. */
async function bumpWeeklyCounter(prefs: PrefsRow, now: Date): Promise<void> {
  const aged = prefs.week_reset_at
    ? now.getTime() - new Date(prefs.week_reset_at).getTime() >= MS_PER_WEEK
    : true;
  const nextCount = (aged ? 0 : prefs.messages_this_week ?? 0) + 1;
  const nextReset = aged ? now.toISOString() : prefs.week_reset_at ?? now.toISOString();
  await dbRun(
    `UPDATE owner_channel_prefs SET messages_this_week = ?, week_reset_at = ?, updated_at = ?
      WHERE id = ?`,
    nextCount,
    nextReset,
    now.toISOString(),
    prefs.id,
  );
}

/** Whether the owner consented to a given channel (booleans on the prefs row). */
function channelConsented(channel: OwnerChannel, prefs: PrefsRow): boolean {
  switch (channel) {
    case "in_app":
      return prefs.in_app_ok;
    case "push":
      return prefs.push_ok;
    case "whatsapp":
      return prefs.whatsapp_ok;
    case "telegram":
      return prefs.telegram_ok;
    case "email":
      return prefs.email_ok;
    case "sms":
      return prefs.sms_ok;
  }
}

/**
 * Orders the policy channels, floating the owner's preferred_channel to the front
 * when present and part of the policy. Keeps relative order otherwise.
 */
function orderChannels(policy: ChannelsPolicy, prefs: PrefsRow): OwnerChannel[] {
  const pref = prefs.preferred_channel as OwnerChannel | null;
  if (!pref || !policy.channels.includes(pref)) return policy.channels;
  return [pref, ...policy.channels.filter((c) => c !== pref)];
}

async function emailSend(to: string | null, title: string): Promise<boolean> {
  if (!to) return false;
  try {
    await sendEmail({ to, subject: title, html: `<p>${title}</p>` });
    return true;
  } catch (err) {
    logger.warn("aftersales_email_failed", { to_present: true, err });
    return false;
  }
}

/**
 * STUBBED SMS sender. No SMS provider is wired in this repo. Logs intent with
 * code SMS_INFRA_MISSING and returns false so the send is recorded 'pending'.
 * SMS-INFRA GAP: integrate a BD bulk-SMS provider (e.g. SSL Wireless) — wire its
 * API key (e.g. SSL_WIRELESS_API_KEY / SSL_WIRELESS_SID, not yet defined) and
 * return true on success. Reserve SMS for time-sensitive/critical touches only.
 */
async function smsSend(to: string | null, title: string): Promise<boolean> {
  logger.warn("aftersales_sms_stubbed", {
    code: "SMS_INFRA_MISSING",
    to_present: Boolean(to),
    subject_preview: title.slice(0, 60),
  });
  return false;
}

/** Bilingual WhatsApp/Telegram body: title, English line, then Bangla line. */
function renderBody(input: OwnerMessageInput): string {
  return `${input.title}\n\n${input.bodyEn}\n\n${input.bodyBn}`;
}

/** Records a per-channel dispatch attempt in admin_marketing_sends. */
async function recordSend(
  input: OwnerMessageInput,
  channel: OwnerChannel,
  status: "sent" | "pending" | "failed",
  reason?: string,
): Promise<void> {
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO admin_marketing_sends
       (id, enrollment_id, sequence_id, channel, content, status, sent_at, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomUUID(),
    input.enrollmentId ?? "aftersales",
    String(input.sequenceStep ?? 0),
    channel,
    JSON.stringify({ event: input.event, title: input.title, bodyEn: input.bodyEn, bodyBn: input.bodyBn }),
    status,
    status === "sent" ? now : null,
    reason ?? null,
    now,
  );
}

/**
 * Dispatches one channel. Returns the outcome WITHOUT recording — the caller
 * records and bumps counters so fallback-mode can stop after the first delivery.
 */
async function dispatchChannel(
  channel: OwnerChannel,
  input: OwnerMessageInput,
  tenantId: string,
  contact: OwnerContact,
): Promise<{ outcome: DispatchOutcome; reason?: string }> {
  try {
    switch (channel) {
      case "in_app": {
        await notify({
          tenantId,
          type: `aftersales_${input.event}`,
          title: input.title,
          body: `${input.bodyEn}\n\n${input.bodyBn}`,
          url: input.url,
        });
        return { outcome: "sent" };
      }
      case "push": {
        await sendPushToTenant(tenantId, { title: input.title, body: input.bodyEn, url: input.url });
        return { outcome: "sent" };
      }
      case "whatsapp": {
        const number = (contact.whatsappNumber ?? "").trim();
        if (!number) return { outcome: "skipped", reason: "no owner whatsapp number (not consented)" };
        await wahaClient.sendText({
          session: GROWTH_WHATSAPP_SESSION,
          chatId: toChatId(number),
          text: renderBody(input),
        });
        return { outcome: "sent" };
      }
      case "telegram": {
        if (contact.telegramChatIds.length === 0) {
          return { outcome: "skipped", reason: "owner has no linked telegram chat" };
        }
        const text = `*${escapeTelegramMarkdown(input.title)}*\n\n${escapeTelegramMarkdown(input.bodyEn)}\n\n${escapeTelegramMarkdown(input.bodyBn)}`;
        for (const chatId of contact.telegramChatIds) {
          await sendTelegramMessage(chatId, text);
        }
        return { outcome: "sent" };
      }
      case "email": {
        const delivered = await emailSend(contact.email, input.title);
        return delivered
          ? { outcome: "sent" }
          : { outcome: "pending", reason: "email infrastructure not configured (stub)" };
      }
      case "sms": {
        const delivered = await smsSend(contact.whatsappNumber, input.title);
        return delivered
          ? { outcome: "sent" }
          : { outcome: "pending", reason: "sms infrastructure not configured (stub)" };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "dispatch failed";
    return { outcome: "failed", reason: message };
  }
}

/**
 * The router. Resolves prefs + contact, enforces opt-out / quiet-hours / weekly
 * cap, picks consented channels per the policy, dispatches with fallback, writes
 * a send row per dispatch, and bumps the weekly counter on the first delivery.
 * Best-effort: never throws to the caller (a lifecycle touch must not break the
 * triggering flow); failures are recorded and returned per-channel.
 */
export async function sendOwnerMessage(
  tenantId: string,
  input: OwnerMessageInput,
): Promise<OwnerMessageResult> {
  const prefs = await resolveOwnerPrefs(tenantId);
  if (!prefs) {
    return { delivered: false, blockedReason: "no_consented_channel", results: [] };
  }

  if (prefs.opted_out) {
    return { delivered: false, blockedReason: "opted_out", results: [] };
  }

  const now = new Date();
  if (isWithinQuietHours(now, prefs.quiet_hours_start, prefs.quiet_hours_end)) {
    return { delivered: false, blockedReason: "quiet_hours", results: [] };
  }

  if (currentWeeklyCount(prefs, now) >= prefs.weekly_cap) {
    return { delivered: false, blockedReason: "weekly_cap", results: [] };
  }

  const consented = orderChannels(input.channelsPolicy, prefs).filter((c) => channelConsented(c, prefs));
  if (consented.length === 0) {
    return { delivered: false, blockedReason: "no_consented_channel", results: [] };
  }

  const contact = await resolveOwnerContact(tenantId, prefs);
  const results: ChannelResult[] = [];
  let delivered = false;

  for (const channel of consented) {
    const { outcome, reason } = await dispatchChannel(channel, input, tenantId, contact);
    const recordStatus = outcome === "skipped" ? "failed" : outcome;
    await recordSend(input, channel, recordStatus, reason);
    results.push({ channel, outcome, reason });

    if (outcome === "sent") {
      delivered = true;
      if (input.channelsPolicy.mode === "fallback") break; // one delivery is enough
    }
  }

  // Count the touch against the weekly cap once, only on a real delivery.
  if (delivered) await bumpWeeklyCounter(prefs, now);

  return { delivered, results };
}
