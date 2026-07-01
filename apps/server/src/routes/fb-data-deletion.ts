import { Hono } from "hono";
import type { Context } from "hono";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { dbRun } from "../db/raw.js";
import { logger } from "../lib/logger.js";
import { getFbAppSecret } from "../lib/env.js";

/**
 * Meta Data Deletion Request Callback (mandatory for Facebook App Review).
 * Mounted at /api/fb/data-deletion. No user session: Meta authenticates each
 * call by signing a `signed_request` with the app secret (HMAC-SHA256).
 *
 *   POST /             — data deletion request; returns the status-page URL.
 *   POST /deauthorize  — user removed the app; logged for audit, returns 200.
 *
 * SECURITY: fail closed. If FB_APP_SECRET is unset or the signature is invalid
 * we never act on the request.
 */

const PUBLIC_HOST = "https://whatapp.ecomex.cloud";

export const fbDataDeletionRoute = new Hono();

interface SignedRequestPayload {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

/** base64url -> Buffer (Meta omits padding). */
function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

/** Buffer -> base64url (no padding), matching Meta's signature encoding. */
function toBase64Url(buf: Buffer): string {
  return buf.toString("base64url");
}

/**
 * Verifies and decodes Meta's `signed_request` (`<sig>.<payload>`). The HMAC is
 * computed over the RAW base64url payload string (before decoding), keyed by the
 * app secret, then base64url-encoded and compared in constant time to the sig.
 * Returns the decoded payload, or null on any failure (fail closed).
 */
function verifySignedRequest(signedRequest: string, appSecret: string): SignedRequestPayload | null {
  const dot = signedRequest.indexOf(".");
  if (dot <= 0 || dot !== signedRequest.lastIndexOf(".")) return null;
  const sigPart = signedRequest.slice(0, dot);
  const payloadPart = signedRequest.slice(dot + 1);
  if (!sigPart || !payloadPart) return null;

  const expected = toBase64Url(createHmac("sha256", appSecret).update(payloadPart).digest());
  const a = Buffer.from(expected);
  const b = Buffer.from(sigPart);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(fromBase64Url(payloadPart).toString("utf8")) as SignedRequestPayload;
  } catch {
    return null;
  }
}

/** Reads `signed_request` from a form-encoded or JSON body. */
async function readSignedRequest(c: Context): Promise<string | null> {
  try {
    const body = (await c.req.parseBody()) as Record<string, unknown>;
    const value = body["signed_request"];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // Not form-encoded — fall through to JSON.
  }
  try {
    const json = (await c.req.json()) as { signed_request?: unknown };
    if (typeof json.signed_request === "string" && json.signed_request.length > 0) {
      return json.signed_request;
    }
  } catch {
    // No usable body.
  }
  return null;
}

fbDataDeletionRoute.post("/", async (c) => {
  const appSecret = getFbAppSecret();
  if (!appSecret) return c.json({ error: "not configured" }, 503);

  const signedRequest = await readSignedRequest(c);
  if (!signedRequest) return c.json({ error: "missing signed_request" }, 400);

  const payload = verifySignedRequest(signedRequest, appSecret);
  if (!payload || !payload.user_id) return c.json({ error: "invalid signature" }, 400);

  const confirmationCode = "del_" + randomBytes(12).toString("hex");

  // No schema column maps an app-scoped FB user_id to our page-scoped data, so
  // there is no safe destructive delete. Persist the request for manual,
  // audited processing. Idempotent on the unique confirmation_code.
  await dbRun(
    `INSERT INTO fb_data_deletion_requests (id, fb_user_id, confirmation_code, status)
       VALUES (?, ?, ?, 'received')
       ON CONFLICT DO NOTHING`,
    crypto.randomUUID(),
    payload.user_id,
    confirmationCode,
  );

  logger.info("fb data deletion request received", {
    fb_user_id: payload.user_id,
    confirmation_code: confirmationCode,
  });

  return c.json({
    url: `${PUBLIC_HOST}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
});

fbDataDeletionRoute.post("/deauthorize", async (c) => {
  const appSecret = getFbAppSecret();
  if (!appSecret) return c.json({ error: "not configured" }, 503);

  const signedRequest = await readSignedRequest(c);
  if (!signedRequest) return c.json({ error: "missing signed_request" }, 400);

  const payload = verifySignedRequest(signedRequest, appSecret);
  if (!payload) return c.json({ error: "invalid signature" }, 400);

  logger.info("fb app deauthorized", { fb_user_id: payload.user_id ?? "unknown" });
  return c.body(null, 200);
});
