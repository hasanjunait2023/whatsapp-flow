import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Minimal WooCommerce REST v3 client. Per-tenant BYOK: the store URL +
 * consumer key/secret come from the tenant's woocommerce_integrations row
 * (secrets decrypted at call time). Auth is HTTP Basic (key:secret) over HTTPS.
 *
 * SECURITY: storeUrl is tenant-controlled, so every request is SSRF-guarded —
 * the host is resolved and rejected if it points at a private/loopback/
 * link-local address (cloud metadata, localhost, RFC1918, etc.).
 */

export interface WooCreds {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

/** True for IPv4/IPv6 addresses that must never be reached from a webhook fetch. */
function isPrivateAddress(ip: string): boolean {
  // Convert IPv6-mapped IPv4 (::ffff:x.x.x.x or ::ffff:xxxx:xxxx) to plain IPv4
  const ipv4Mapped = ip.startsWith("::ffff:");
  const checkIp = ipv4Mapped ? ip.slice(7) : ip;

  const v = isIP(checkIp);
  if (v === 4) {
    const [a, b] = checkIp.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  // If it was an IPv6-mapped address but the stripped part isn't valid IPv4,
  // try parsing the last 4 bytes as hex (e.g. ::ffff:7f00:1 → 127.0.0.1)
  if (ipv4Mapped) {
    const hexParts = checkIp.split(":");
    if (hexParts.length === 2) {
      const combined = parseInt(hexParts[0], 16) * 65536 + parseInt(hexParts[1], 16);
      const ipv4 = `${(combined >>> 24) & 0xff}.${(combined >>> 16) & 0xff}.${(combined >>> 8) & 0xff}.${combined & 0xff}`;
      return isPrivateAddress(ipv4);
    }
  }
  const lower = checkIp.toLowerCase();
  return (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") || // ULA fc00::/7
    lower.startsWith("fe80") || // link-local
    false
  );
}

/** Validates storeUrl is a public http(s) endpoint; throws otherwise. */
async function assertSafeStoreUrl(storeUrl: string): Promise<void> {
  let u: URL;
  try {
    u = new URL(storeUrl);
  } catch {
    throw new Error("Invalid store URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("store URL must be http(s)");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("store URL host is not allowed");
  }
  // Resolve all A/AAAA records and reject if ANY is private (DNS-rebinding safe-ish).
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addrs.length === 0) throw new Error("store URL host did not resolve");
  for (const a of addrs) {
    if (isPrivateAddress(a.address)) throw new Error("store URL resolves to a private address");
  }
}

/** Rejects CR/LF injection in credentials placed into the Authorization header. */
function safeCred(value: string, label: string): string {
  if (/[\r\n]/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

export interface WooProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  description: string;
  short_description: string;
  status: string;
  stock_quantity: number | null;
  images: Array<{ src: string }>;
}

function authHeader(creds: WooCreds): string {
  const key = safeCred(creds.consumerKey, "consumer key");
  const secret = safeCred(creds.consumerSecret, "consumer secret");
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

function baseUrl(storeUrl: string): string {
  return storeUrl.replace(/\/+$/, "");
}

/** Fetches up to `max` products (paginated, 100/page). */
export async function listProducts(creds: WooCreds, max = 500): Promise<WooProduct[]> {
  await assertSafeStoreUrl(creds.storeUrl);
  const out: WooProduct[] = [];
  const perPage = 100;
  for (let page = 1; out.length < max; page++) {
    const url = `${baseUrl(creds.storeUrl)}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: authHeader(creds), Accept: "application/json" }, redirect: "manual" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `WooCommerce products fetch failed (HTTP ${res.status})`);
    }
    const batch = (await res.json()) as WooProduct[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    if (batch.length < perPage) break;
  }
  return out.slice(0, max);
}

/** Lightweight credential check (1 product, HEAD-ish). Throws on bad creds. */
export async function verifyCreds(creds: WooCreds): Promise<void> {
  await assertSafeStoreUrl(creds.storeUrl);
  const url = `${baseUrl(creds.storeUrl)}/wp-json/wc/v3/products?per_page=1`;
  const res = await fetch(url, { headers: { Authorization: authHeader(creds), Accept: "application/json" }, redirect: "manual" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `WooCommerce auth failed (HTTP ${res.status})`);
  }
}
