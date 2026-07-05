import { createHash, randomInt } from "node:crypto";
import { dbGet, dbRun } from "../db/raw.js";
import { wahaClient } from "../waha/client.js";
import { GROWTH_WHATSAPP_SESSION } from "../lib/env.js";
import type { FnContext, FnResult } from "./waha/session.js";

const fail = (message: string): FnResult => ({ data: null, error: { message } });
const ok = (data: unknown): FnResult => ({ data, error: null });

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60 * 1000;

function normalize(phone: string): string {
  return phone.replace(/\D/g, "");
}

function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

interface OtpCountRow { cnt: number }
interface OtpRow {
  id: string;
  otp_hash: string;
  expires_at: string;
  attempts: number;
}

async function sendPhoneOtp(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  if (!PHONE_REGEX.test(phone)) {
    return fail("Invalid phone number. Use international format: +8801XXXXXXXXX");
  }

  const normalized = normalize(phone);
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  const recent = (await dbGet(
    `SELECT COUNT(*) as cnt FROM phone_otp_requests WHERE user_id = ? AND created_at > ?`,
    ctx.userId,
    windowStart,
  )) as OtpCountRow | null;

  if ((recent?.cnt ?? 0) >= MAX_SENDS_PER_WINDOW) {
    return fail("Too many verification attempts. Please wait 10 minutes.");
  }

  const otp = String(randomInt(100_000, 1_000_000));
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS).toISOString();
  const now = new Date().toISOString();

  await dbRun(
    `DELETE FROM phone_otp_requests WHERE user_id = ? AND phone = ? AND verified_at IS NULL`,
    ctx.userId,
    normalized,
  );

  await dbRun(
    `INSERT INTO phone_otp_requests (id, user_id, phone, otp_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?)`,
    crypto.randomUUID(),
    ctx.userId,
    normalized,
    otpHash,
    expiresAt,
    now,
  );

  try {
    await wahaClient.sendText({
      session: GROWTH_WHATSAPP_SESSION,
      chatId: `${normalized}@c.us`,
      text: `Your verification code: *${otp}*\n\nValid for 10 minutes. Do not share it with anyone.`,
    });
  } catch (err) {
    // Roll back so the rate-limit window isn't consumed for a failed send
    await dbRun(
      `DELETE FROM phone_otp_requests WHERE user_id = ? AND phone = ? AND otp_hash = ?`,
      ctx.userId,
      normalized,
      otpHash,
    ).catch(() => undefined);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("not found") || msg.includes("404")) {
      return fail("This number may not have WhatsApp. Please check and try again.");
    }
    return fail("WhatsApp service unavailable. Please try again later.");
  }

  return ok({ sent: true, expires_in: 600 });
}

async function verifyPhoneOtp(raw: Record<string, unknown>, ctx: FnContext): Promise<FnResult> {
  const phone = typeof raw.phone === "string" ? raw.phone.trim() : "";
  const otp = typeof raw.otp === "string" ? raw.otp.trim() : "";

  if (!PHONE_REGEX.test(phone)) return fail("Invalid phone number.");
  if (!/^\d{6}$/.test(otp)) return fail("OTP must be exactly 6 digits.");

  const normalized = normalize(phone);

  const row = (await dbGet(
    `SELECT id, otp_hash, expires_at, attempts
     FROM phone_otp_requests
     WHERE user_id = ? AND phone = ? AND verified_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    ctx.userId,
    normalized,
  )) as OtpRow | null;

  if (!row) return fail("No pending verification for this number. Request a new code.");
  if (new Date(row.expires_at) < new Date()) return fail("Code expired. Request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) return fail("Too many incorrect attempts. Request a new code.");

  // Increment before compare — prevents timing-based enumeration
  await dbRun(`UPDATE phone_otp_requests SET attempts = attempts + 1 WHERE id = ?`, row.id);

  if (hashOtp(otp) !== row.otp_hash) {
    const remaining = MAX_ATTEMPTS - row.attempts - 1;
    return fail(`Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  const verifiedAt = new Date().toISOString();
  await dbRun(`UPDATE phone_otp_requests SET verified_at = ? WHERE id = ?`, verifiedAt, row.id);
  await dbRun(
    `UPDATE profiles SET phone_number = ?, updated_at = ? WHERE id = ?`,
    `+${normalized}`,
    verifiedAt,
    ctx.userId,
  );

  return ok({ verified: true, phone: `+${normalized}` });
}

export const PHONE_OTP_HANDLERS = {
  "send-phone-otp": sendPhoneOtp,
  "verify-phone-otp": verifyPhoneOtp,
};
