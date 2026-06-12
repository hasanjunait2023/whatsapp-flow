/**
 * Steadfast Courier (Bangladesh) REST client.
 * Docs: https://steadfast.com.bd — base https://portal.packzy.com/api/v1
 * Auth: per-tenant Api-Key + Secret-Key headers (BYOK — the tenant supplies
 * their own credentials in Courier settings; never platform-wide).
 */

const STEADFAST_BASE = "https://portal.packzy.com/api/v1";

export interface SteadfastCreds {
  apiKey: string;
  apiSecret: string;
}

export interface CreateOrderInput {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

export interface CreateOrderResult {
  consignmentId: string | null;
  trackingCode: string | null;
  status: string;
  raw: unknown;
}

function authHeaders(creds: SteadfastCreds): Record<string, string> {
  return {
    "Api-Key": creds.apiKey,
    "Secret-Key": creds.apiSecret,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function createOrder(
  creds: SteadfastCreds,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const res = await fetch(`${STEADFAST_BASE}/create_order`, {
    method: "POST",
    headers: authHeaders(creds),
    body: JSON.stringify({
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
      note: input.note ?? "",
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    status?: number;
    message?: string;
    consignment?: { consignment_id?: number | string; tracking_code?: string; status?: string };
  };
  if (!res.ok || !body.consignment) {
    throw new Error(body.message ?? `Steadfast create_order failed (HTTP ${res.status})`);
  }
  return {
    consignmentId: body.consignment.consignment_id != null ? String(body.consignment.consignment_id) : null,
    trackingCode: body.consignment.tracking_code ?? null,
    status: body.consignment.status ?? "in_review",
    raw: body,
  };
}

export async function statusByConsignment(
  creds: SteadfastCreds,
  consignmentId: string,
): Promise<{ status: string; raw: unknown }> {
  const res = await fetch(`${STEADFAST_BASE}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
    headers: authHeaders(creds),
  });
  const body = (await res.json().catch(() => ({}))) as { delivery_status?: string; message?: string };
  if (!res.ok) {
    throw new Error(body.message ?? `Steadfast status check failed (HTTP ${res.status})`);
  }
  return { status: body.delivery_status ?? "unknown", raw: body };
}
