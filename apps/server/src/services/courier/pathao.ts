/**
 * Pathao Courier (Bangladesh) Merchant API client. Per-tenant BYOK.
 * Auth: OAuth2 password grant (client_id + client_secret + merchant
 * username/password) → bearer access token, cached in-process until it nears
 * expiry. Production base https://api-hermes.pathao.com.
 *
 * NOTE: Pathao booking needs NUMERIC city/zone/area IDs (not names). The caller
 * must supply Pathao's IDs in recipient_city/zone/area; a city/zone/area lookup
 * UI is a follow-up (documented in BACKLOG).
 */

const PROD_BASE = "https://api-hermes.pathao.com";

export interface PathaoCreds {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId: string;
  baseUrl?: string;
}

export interface PathaoOrderInput {
  merchantOrderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  recipientCity?: string | number;
  recipientZone?: string | number;
  recipientArea?: string | number;
  amountToCollect: number;
  specialInstruction?: string;
  itemWeight?: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}
const tokenCache = new Map<string, CachedToken>();
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 min — tokens last 60 min

// Periodic TTL eviction: clear expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (now >= val.expiresAt) tokenCache.delete(key);
  }
}, 5 * 60 * 1000).unref();

function base(creds: PathaoCreds): string {
  return (creds.baseUrl || PROD_BASE).replace(/\/+$/, "");
}

async function getToken(creds: PathaoCreds, nowMs: number): Promise<string> {
  const cacheKey = `${base(creds)}|${creds.clientId}|${creds.username}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs + 60_000) return cached.token;

  const res = await fetch(`${base(creds)}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "password",
      username: creds.username,
      password: creds.password,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(body.message ?? `Pathao auth failed (HTTP ${res.status})`);
  }
  tokenCache.set(cacheKey, {
    token: body.access_token,
    expiresAt: nowMs + Math.min((body.expires_in ?? 3600) * 1000, TOKEN_TTL_MS),
  });
  return body.access_token;
}

export async function createOrder(
  creds: PathaoCreds,
  input: PathaoOrderInput,
  nowMs: number = 0,
): Promise<{ consignmentId: string | null; status: string; raw: unknown }> {
  const token = await getToken(creds, nowMs || dateNow());
  const res = await fetch(`${base(creds)}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      store_id: creds.storeId,
      merchant_order_id: input.merchantOrderId,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: input.recipientCity,
      recipient_zone: input.recipientZone,
      recipient_area: input.recipientArea,
      delivery_type: 48, // 48h standard
      item_type: 2, // parcel
      special_instruction: input.specialInstruction ?? "",
      item_quantity: 1,
      item_weight: input.itemWeight ?? 0.5,
      amount_to_collect: input.amountToCollect,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { consignment_id?: string; order_status?: string };
    message?: string;
  };
  if (!res.ok || !body.data?.consignment_id) {
    throw new Error(body.message ?? `Pathao create order failed (HTTP ${res.status})`);
  }
  return { consignmentId: body.data.consignment_id, status: body.data.order_status ?? "Pending", raw: body };
}

export async function trackOrder(
  creds: PathaoCreds,
  consignmentId: string,
  nowMs: number = 0,
): Promise<{ status: string; raw: unknown }> {
  const token = await getToken(creds, nowMs || dateNow());
  const res = await fetch(`${base(creds)}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as { data?: { order_status?: string }; message?: string };
  if (!res.ok) throw new Error(body.message ?? `Pathao tracking failed (HTTP ${res.status})`);
  return { status: body.data?.order_status ?? "unknown", raw: body };
}

// Indirection so the module has no top-level Date.now (kept testable).
function dateNow(): number {
  return Date.now();
}
