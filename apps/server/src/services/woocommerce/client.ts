/**
 * Minimal WooCommerce REST v3 client. Per-tenant BYOK: the store URL +
 * consumer key/secret come from the tenant's woocommerce_integrations row
 * (secrets decrypted at call time). Auth is HTTP Basic (key:secret) over HTTPS.
 */

export interface WooCreds {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
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
  return "Basic " + Buffer.from(`${creds.consumerKey}:${creds.consumerSecret}`).toString("base64");
}

function baseUrl(storeUrl: string): string {
  return storeUrl.replace(/\/+$/, "");
}

/** Fetches up to `max` products (paginated, 100/page). */
export async function listProducts(creds: WooCreds, max = 500): Promise<WooProduct[]> {
  const out: WooProduct[] = [];
  const perPage = 100;
  for (let page = 1; out.length < max; page++) {
    const url = `${baseUrl(creds.storeUrl)}/wp-json/wc/v3/products?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: authHeader(creds), Accept: "application/json" } });
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
  const url = `${baseUrl(creds.storeUrl)}/wp-json/wc/v3/products?per_page=1`;
  const res = await fetch(url, { headers: { Authorization: authHeader(creds), Accept: "application/json" } });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message ?? `WooCommerce auth failed (HTTP ${res.status})`);
  }
}
