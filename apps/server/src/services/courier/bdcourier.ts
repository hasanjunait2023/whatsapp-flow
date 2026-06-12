/**
 * BDCourier fraud / delivery-success check.
 * Aggregates a phone number's success vs cancellation history across BD couriers
 * so a merchant can decide whether to ship COD. Docs: https://bdcourier.com
 * Auth: per-tenant bearer API key (BYOK — stored as a courier_integrations row
 * with provider='bdcourier').
 */

const BDCOURIER_URL = "https://bdcourier.com/api/courier-check";

export interface CourierStat {
  name: string;
  total: number;
  success: number;
  cancel: number;
}

export interface BdCourierResult {
  phone: string;
  totalParcels: number;
  totalSuccess: number;
  totalCancel: number;
  successRatio: number; // 0..1
  couriers: CourierStat[];
  raw: unknown;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function checkPhone(apiKey: string, phone: string): Promise<BdCourierResult> {
  const res = await fetch(BDCOURIER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ phone }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
    courierData?: {
      summary?: { total_parcel?: number; success_parcel?: number; cancelled_parcel?: number };
      // courier-wise breakdown keyed by courier name
      [courier: string]: unknown;
    };
  };
  if (!res.ok) {
    throw new Error(body.message ?? `BDCourier check failed (HTTP ${res.status})`);
  }

  const data = body.courierData ?? {};
  const summary = data.summary ?? {};
  const couriers: CourierStat[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (key === "summary" || typeof val !== "object" || val === null) continue;
    const c = val as { total_parcel?: unknown; success_parcel?: unknown; cancelled_parcel?: unknown };
    couriers.push({
      name: key,
      total: num(c.total_parcel),
      success: num(c.success_parcel),
      cancel: num(c.cancelled_parcel),
    });
  }

  const totalParcels = num(summary.total_parcel);
  const totalSuccess = num(summary.success_parcel);
  const totalCancel = num(summary.cancelled_parcel);
  return {
    phone,
    totalParcels,
    totalSuccess,
    totalCancel,
    successRatio: totalParcels > 0 ? totalSuccess / totalParcels : 0,
    couriers,
    raw: body,
  };
}
