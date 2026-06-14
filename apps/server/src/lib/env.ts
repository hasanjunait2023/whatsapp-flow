import path from "node:path";

/**
 * Centralised environment access. Required secrets are validated lazily so that
 * tooling (drizzle-kit, tests) can import the schema without a full runtime env.
 */

// Dev convenience: load ./.env (apps/server/.env, gitignored) when present.
// Production gets env from compose env_file; tests set process.env directly
// before importing this module, so both are excluded.
if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  try {
    (process as unknown as { loadEnvFile?: () => void }).loadEnvFile?.();
  } catch {
    // no .env file — shell environment is the source of truth
  }
}

/**
 * Postgres connection string. Required at runtime (prod points at the shared
 * postiz-postgres instance, db `whatsapp_flow`). Tests use an in-process PGlite
 * instance instead, so this is read lazily — importing the schema for tooling
 * (drizzle-kit) or tests must not require a live URL.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  return url;
}

/** Raw value (may be empty); use getDatabaseUrl() where a URL is required. */
export const DATABASE_URL = process.env.DATABASE_URL ?? "";

export const MEDIA_DIR =
  process.env.MEDIA_DIR ?? path.resolve(process.cwd(), "data", "media");

export const PORT = Number(process.env.PORT ?? 3000);

export const NODE_ENV = process.env.NODE_ENV ?? "development";

export const IS_PRODUCTION = NODE_ENV === "production";

/** Absolute path to the built SPA (apps/web/dist), served in production. */
export const WEB_DIST_DIR =
  process.env.WEB_DIST_DIR ?? path.resolve(process.cwd(), "..", "web", "dist");

/** Secret used by better-auth for signing. Required at runtime, not at import. */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

/** Base URL the auth server is reachable at (same-origin in production). */
export const AUTH_BASE_URL = process.env.AUTH_BASE_URL ?? `http://localhost:${PORT}`;

// --- WAHA (WhatsApp HTTP API) -----------------------------------------------

/** Base URL of the WAHA REST API (pilot: http://127.0.0.1:3999, prod: http://waha:3000). */
export const WAHA_URL = process.env.WAHA_URL ?? "http://127.0.0.1:3999";

/** API key sent as the X-Api-Key header on every WAHA request. */
export const WAHA_API_KEY = process.env.WAHA_API_KEY ?? "";

/**
 * Core/pilot mode: WAHA Core supports only a single session named `default`,
 * so every instance id is mapped to `default`. In Plus mode (false) the session
 * name equals the instance id, enabling one session per tenant instance.
 */
export const WAHA_SINGLE_SESSION =
  (process.env.WAHA_SINGLE_SESSION ?? "true").toLowerCase() === "true";

/**
 * Public base URL WAHA uses to reach our webhook endpoint. In prod this is the
 * container-network address of the app (e.g. http://app:3000); the webhook path
 * /api/waha/webhook/{instanceId} is appended per instance.
 */
export const WAHA_WEBHOOK_BASE_URL =
  process.env.WAHA_WEBHOOK_BASE_URL ?? AUTH_BASE_URL;

/** Optional HMAC secret WAHA Plus uses to sign webhooks; verification is gated on this. */
export const WAHA_WEBHOOK_HMAC_SECRET = process.env.WAHA_WEBHOOK_HMAC_SECRET ?? "";

/**
 * Forces webhook HMAC verification on even before a secret is wired (defense in
 * depth: a misconfigured prod that sets REQUIRE but forgets the secret rejects
 * all webhooks rather than accepting unsigned ones).
 */
export const WAHA_WEBHOOK_REQUIRE_HMAC =
  (process.env.WAHA_WEBHOOK_REQUIRE_HMAC ?? "false").toLowerCase() === "true";

/** True when webhook signatures must be present and valid (secret set or required). */
export const WAHA_WEBHOOK_HMAC_ENFORCED =
  WAHA_WEBHOOK_HMAC_SECRET.length > 0 || WAHA_WEBHOOK_REQUIRE_HMAC;

/**
 * Emits a one-line startup warning (not a hard throw) when webhook HMAC is not
 * enforced. Pilot/Core has no secret and runs loopback-only, so this is allowed;
 * production with WAHA Plus MUST set WAHA_WEBHOOK_HMAC_SECRET.
 */
export function warnIfWebhookUnverified(): void {
  if (!WAHA_WEBHOOK_HMAC_ENFORCED) {
    process.emitWarning(
      "WAHA webhook HMAC verification is DISABLED (WAHA_WEBHOOK_HMAC_SECRET unset). " +
        "Acceptable for the loopback Core/pilot only — production with WAHA Plus MUST set the secret.",
      { code: "WAHA_WEBHOOK_UNVERIFIED" },
    );
  }
}

// --- Telegram (single platform bot; per-tenant chat linking) ------------------

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
export const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? "";
/** Validates X-Telegram-Bot-Api-Secret-Token on the webhook route. */
export const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

/**
 * Emits a one-line startup warning when the Telegram webhook secret token is
 * unset (mirrors warnIfWebhookUnverified for WAHA). Without it the webhook
 * route fails closed in production (rejects every request), so the bot is inert
 * — a loud warning makes that misconfiguration visible at boot. The hard-fail
 * in production lives in index.ts alongside the WAHA HMAC check.
 */
export function warnIfTelegramWebhookUnverified(): void {
  if (!TELEGRAM_WEBHOOK_SECRET) {
    process.emitWarning(
      "Telegram webhook secret is DISABLED (TELEGRAM_WEBHOOK_SECRET unset). " +
        "Acceptable for local dev/test only — production MUST set the secret or the " +
        "webhook route rejects every Telegram update (the bot will be inert).",
      { code: "TELEGRAM_WEBHOOK_UNVERIFIED" },
    );
  }
}

// --- Ops alerting (platform-level, not per-tenant) ---------------------------

/**
 * Telegram chat id that receives platform ops alerts (backend errors, RAM/disk
 * pressure). Empty disables sending — alerts then only hit the structured log.
 */
export const OPS_TELEGRAM_CHAT_ID = process.env.OPS_TELEGRAM_CHAT_ID ?? "";

// --- Growth approval gate (autonomous growth system) -------------------------

/**
 * Telegram chat id that receives growth approval cards (publish/spend/contact).
 * Falls back to the ops chat so a single founder chat works out of the box.
 */
export const GROWTH_TELEGRAM_CHAT_ID =
  process.env.GROWTH_TELEGRAM_CHAT_ID ?? OPS_TELEGRAM_CHAT_ID;

/**
 * Optional allowlist: only this Telegram user id may approve/reject growth
 * actions via inline buttons. Empty = any tap on the linked chat is honored.
 */
export const FOUNDER_TG_USER_ID = process.env.FOUNDER_TG_USER_ID ?? "";

// --- Postiz (social scheduling backend) --------------------------------------

/** Base URL of the Postiz instance; the public API lives at <url>/public/v1. */
export const POSTIZ_URL = process.env.POSTIZ_URL ?? "http://127.0.0.1:3000";

/** Postiz public-API key, sent verbatim in the Authorization header. */
export const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY ?? "";

/** Resource-pressure alert thresholds (fractions 0..1). Box is RAM-tight. */
export const ALERT_MEM_THRESHOLD = Number(process.env.ALERT_MEM_THRESHOLD ?? "0.85");
export const ALERT_DISK_THRESHOLD = Number(process.env.ALERT_DISK_THRESHOLD ?? "0.80");

// --- Crypto payments (manual USDT transfer) ----------------------------------

/** Platform USDT receiving addresses per network; empty = network disabled. */
export const CRYPTO_USDT_ADDRESS_TRC20 = process.env.CRYPTO_USDT_ADDRESS_TRC20 ?? "";
export const CRYPTO_USDT_ADDRESS_BEP20 = process.env.CRYPTO_USDT_ADDRESS_BEP20 ?? "";

// --- UddoktaPay (BDT gateway) ------------------------------------------------

/** Gateway API key + base URL; empty disables the UddoktaPay checkout path. */
export const UDDOKTAPAY_API_KEY = process.env.UDDOKTAPAY_API_KEY ?? "";
export const UDDOKTAPAY_BASE_URL = process.env.UDDOKTAPAY_BASE_URL ?? "";

// --- Facebook / Meta Graph ---------------------------------------------------

/** Graph API version for Messenger send / comment-reply / profile fetch. */
export const FB_GRAPH_VERSION = process.env.FB_GRAPH_VERSION ?? "v21.0";

/** App-level webhook verify token (used during initial Meta app setup). */
export const FB_WEBHOOK_VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN ?? "";

/**
 * Meta app credentials for the Facebook Login (page connect) OAuth flow.
 * Read lazily so tests can set them per-suite; empty = FB connect disabled.
 */
export function getFbAppId(): string {
  return process.env.FB_APP_ID ?? "";
}
export function getFbAppSecret(): string {
  return process.env.FB_APP_SECRET ?? "";
}
/** Optional Facebook Login for Business configuration id (replaces scope list). */
export function getFbLoginConfigId(): string {
  return process.env.FB_LOGIN_CONFIG_ID ?? "";
}
/** OAuth redirect URI registered in the Meta app; defaults to this server. */
export function getFbOauthRedirectUrl(): string {
  return process.env.FB_OAUTH_REDIRECT_URL ?? `${AUTH_BASE_URL}/api/fb/oauth/callback`;
}

/**
 * Master key for AES-256-GCM encryption of stored secrets (per-tenant API keys).
 * 64 hex chars (32 bytes). Required at runtime by lib/crypto.ts, not at import.
 */
export function getMasterKey(): Buffer {
  const hex = process.env.MASTER_KEY;
  if (!hex) {
    throw new Error("MASTER_KEY is not configured");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("MASTER_KEY must be 64 hex characters (32 bytes)");
  }
  return key;
}
