import { sqlite } from "../db/index.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { createOrder, statusByConsignment } from "../services/courier/steadfast.js";
import { checkPhone } from "../services/courier/bdcourier.js";
import {
  createOrder as pathaoCreateOrder,
  trackOrder as pathaoTrackOrder,
  type PathaoCreds,
} from "../services/courier/pathao.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Courier (Bangladesh) fn handlers — BYOK per tenant. Credentials live in
 * courier_integrations (api_key/api_secret encrypted at rest, redacted from the
 * generic /api/query reads). Steadfast booking + tracking and BDCourier risk
 * checks are implemented. Pathao uses OAuth (password grant); its merchant
 * username/password live in the integration's settings (password encrypted).
 */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

function fail(message: string): FnResult {
  return { data: null, error: { message } };
}
function ok(data: unknown): FnResult {
  return { data, error: null };
}

interface IntegrationRow {
  id: string;
  provider: string;
  api_key: string | null;
  api_secret: string | null;
  store_id: string | null;
  is_active: number | null;
  default_pickup_address: string | null;
}

/** Loads + decrypts a tenant's integration for a provider (null if absent/inactive). */
function loadCreds(
  tenantId: string,
  provider: string,
): { apiKey: string; apiSecret: string } | null {
  const row = sqlite
    .prepare(
      `SELECT api_key, api_secret, is_active FROM courier_integrations
       WHERE tenant_id = ? AND provider = ? LIMIT 1`,
    )
    .get(tenantId, provider) as
    | { api_key: string | null; api_secret: string | null; is_active: number | null }
    | undefined;
  if (!row || row.is_active === 0 || !row.api_key) return null;
  return {
    apiKey: decryptSecret(row.api_key),
    apiSecret: row.api_secret ? decryptSecret(row.api_secret) : "",
  };
}

/** Loads + decrypts a tenant's Pathao credentials (client id/secret in api_key/
 * api_secret; merchant username/password in settings; store id in store_id). */
function loadPathaoCreds(tenantId: string): PathaoCreds | null {
  const row = sqlite
    .prepare(
      `SELECT api_key, api_secret, store_id, settings, is_active
         FROM courier_integrations WHERE tenant_id = ? AND provider = 'pathao' LIMIT 1`,
    )
    .get(tenantId) as
    | { api_key: string | null; api_secret: string | null; store_id: string | null; settings: string | null; is_active: number | null }
    | undefined;
  if (!row || row.is_active === 0 || !row.api_key || !row.store_id) return null;
  let settings: { username?: string; password_enc?: string; sandbox?: boolean } = {};
  try {
    settings = row.settings ? JSON.parse(row.settings) : {};
  } catch {
    settings = {};
  }
  if (!settings.username || !settings.password_enc) return null;
  return {
    clientId: decryptSecret(row.api_key),
    clientSecret: row.api_secret ? decryptSecret(row.api_secret) : "",
    username: settings.username,
    password: decryptSecret(settings.password_enc),
    storeId: row.store_id,
    baseUrl: settings.sandbox ? "https://courier-api-sandbox.pathao.com" : undefined,
  };
}

interface BookInput {
  order_id?: string;
  courier?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  weight_kg?: number;
  item_description?: string;
  special_instructions?: string;
  delivery_address?: unknown;
  recipient_city?: string | number;
  recipient_zone?: string | number;
  recipient_area?: string | number;
}

/** Books one parcel, inserting a shipments row. Returns a per-parcel result. */
async function bookOne(
  tenantId: string,
  p: BookInput,
): Promise<{ success: boolean; order_id?: string; shipment_id?: string; consignment_id?: string | null; tracking_code?: string | null; error?: string }> {
  const courier = (p.courier ?? "steadfast").toLowerCase();
  const orderId = p.order_id;
  if (!orderId) return { success: false, error: "order_id is required" };
  if (!p.recipient_name || !p.recipient_phone || !p.recipient_address) {
    return { success: false, order_id: orderId, error: "recipient name, phone and address are required" };
  }

  // Confirm the order belongs to this tenant (defense in depth).
  const order = sqlite
    .prepare("SELECT 1 FROM orders WHERE id = ? AND tenant_id = ? LIMIT 1")
    .get(orderId, tenantId);
  if (!order) return { success: false, order_id: orderId, error: "Order not found" };

  if (courier === "pathao") {
    const pathao = loadPathaoCreds(tenantId);
    if (!pathao) {
      return { success: false, order_id: orderId, error: "Pathao is not fully configured (needs client id/secret, store id, username & password)" };
    }
    try {
      const result = await pathaoCreateOrder(pathao, {
        merchantOrderId: orderId,
        recipientName: p.recipient_name,
        recipientPhone: p.recipient_phone,
        recipientAddress: p.recipient_address,
        recipientCity: p.recipient_city,
        recipientZone: p.recipient_zone,
        recipientArea: p.recipient_area,
        amountToCollect: Number(p.cod_amount ?? 0),
        specialInstruction: p.special_instructions,
        itemWeight: p.weight_kg ?? undefined,
      });
      const shipmentId = crypto.randomUUID();
      sqlite
        .prepare(
          `INSERT INTO shipments
             (id, tenant_id, order_id, courier, consignment_id, tracking_code, status,
              cod_amount, delivery_address, item_description, special_instructions, weight_kg, courier_response, booked_at)
           VALUES (?, ?, ?, 'pathao', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          shipmentId,
          tenantId,
          orderId,
          result.consignmentId,
          result.consignmentId,
          result.status,
          p.cod_amount ?? null,
          p.delivery_address != null ? JSON.stringify(p.delivery_address) : null,
          p.item_description ?? null,
          p.special_instructions ?? null,
          p.weight_kg ?? null,
          JSON.stringify(result.raw),
          new Date().toISOString(),
        );
      return { success: true, order_id: orderId, shipment_id: shipmentId, consignment_id: result.consignmentId, tracking_code: result.consignmentId };
    } catch (err) {
      return { success: false, order_id: orderId, error: err instanceof Error ? err.message : "Pathao booking failed" };
    }
  }
  if (courier !== "steadfast") {
    return { success: false, order_id: orderId, error: `Unsupported courier "${courier}"` };
  }

  const creds = loadCreds(tenantId, "steadfast");
  if (!creds) return { success: false, order_id: orderId, error: "Steadfast is not configured or inactive" };

  try {
    const result = await createOrder(
      { apiKey: creds.apiKey, apiSecret: creds.apiSecret },
      {
        invoice: orderId,
        recipientName: p.recipient_name,
        recipientPhone: p.recipient_phone,
        recipientAddress: p.recipient_address,
        codAmount: Number(p.cod_amount ?? 0),
        note: p.special_instructions,
      },
    );
    const shipmentId = crypto.randomUUID();
    sqlite
      .prepare(
        `INSERT INTO shipments
           (id, tenant_id, order_id, courier, consignment_id, tracking_code, status,
            cod_amount, delivery_address, item_description, special_instructions, weight_kg,
            courier_response, booked_at)
         VALUES (?, ?, ?, 'steadfast', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        shipmentId,
        tenantId,
        orderId,
        result.consignmentId,
        result.trackingCode,
        result.status,
        p.cod_amount ?? null,
        p.delivery_address != null ? JSON.stringify(p.delivery_address) : null,
        p.item_description ?? null,
        p.special_instructions ?? null,
        p.weight_kg ?? null,
        JSON.stringify(result.raw),
        new Date().toISOString(),
      );
    return {
      success: true,
      order_id: orderId,
      shipment_id: shipmentId,
      consignment_id: result.consignmentId,
      tracking_code: result.trackingCode,
    };
  } catch (err) {
    return { success: false, order_id: orderId, error: err instanceof Error ? err.message : "Booking failed" };
  }
}

export const COURIER_HANDLERS: Record<string, FnHandler> = {
  // Save/update a tenant's courier credentials (encrypts secrets at rest).
  "courier-save-integration": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const provider = typeof body.provider === "string" ? body.provider.toLowerCase() : "";
    if (!["steadfast", "pathao", "bdcourier"].includes(provider)) return fail("Unknown courier provider");

    const apiKey = typeof body.api_key === "string" ? body.api_key.trim() : "";
    const apiSecret = typeof body.api_secret === "string" ? body.api_secret.trim() : "";
    const storeId = typeof body.store_id === "string" ? body.store_id : null;
    const isActive = body.is_active === false ? 0 : 1;
    const pickup = body.default_pickup_address != null ? JSON.stringify(body.default_pickup_address) : null;

    const existing = sqlite
      .prepare("SELECT id, api_key, api_secret, settings FROM courier_integrations WHERE tenant_id = ? AND provider = ? LIMIT 1")
      .get(ctx.tenantId, provider) as (IntegrationRow & { settings: string | null }) | undefined;

    // Only overwrite a secret when a new non-empty value is supplied (so a save
    // that leaves the redacted field blank keeps the stored credential).
    const encKey = apiKey ? encryptSecret(apiKey) : existing?.api_key ?? null;
    const encSecret = apiSecret ? encryptSecret(apiSecret) : existing?.api_secret ?? null;
    const now = new Date().toISOString();

    // settings: for Pathao this carries username + password (password ENCRYPTED;
    // the whole settings blob is redacted from /api/query). Preserve the stored
    // password when the form leaves it blank.
    let settingsJson: string | null = existing?.settings ?? null;
    const inSettings = body.settings && typeof body.settings === "object" ? (body.settings as Record<string, unknown>) : null;
    if (inSettings) {
      let prev: Record<string, unknown> = {};
      try {
        prev = existing?.settings ? JSON.parse(existing.settings) : {};
      } catch {
        prev = {};
      }
      const next: Record<string, unknown> = { ...prev };
      if (typeof inSettings.username === "string") next.username = inSettings.username;
      if (typeof inSettings.sandbox === "boolean") next.sandbox = inSettings.sandbox;
      if (typeof inSettings.password === "string" && inSettings.password.trim()) {
        next.password_enc = encryptSecret(inSettings.password.trim());
      }
      settingsJson = JSON.stringify(next);
    }

    if (existing) {
      sqlite
        .prepare(
          `UPDATE courier_integrations
             SET api_key = ?, api_secret = ?, store_id = ?, is_active = ?, default_pickup_address = ?, settings = ?, updated_at = ?
           WHERE id = ?`,
        )
        .run(encKey, encSecret, storeId, isActive, pickup, settingsJson, now, existing.id);
    } else {
      sqlite
        .prepare(
          `INSERT INTO courier_integrations
             (id, tenant_id, provider, api_key, api_secret, store_id, is_active, default_pickup_address, settings, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(crypto.randomUUID(), ctx.tenantId, provider, encKey, encSecret, storeId, isActive, pickup, settingsJson, now, now);
    }
    return ok({ success: true, provider });
  },

  // Phone fraud / delivery-success check via BDCourier.
  "bdcourier-check": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!phone) return fail("phone is required");
    const creds = loadCreds(ctx.tenantId, "bdcourier");
    if (!creds) return fail("BDCourier is not configured. Add your API key in Courier settings.");
    try {
      const result = await checkPhone(creds.apiKey, phone);
      return ok(result);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "BDCourier check failed");
    }
  },

  // Book one parcel (single body) or many ({ parcels: [...] }).
  "courier-book-parcel": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    if (Array.isArray(body.parcels)) {
      const results = [];
      for (const p of body.parcels as BookInput[]) {
        results.push(await bookOne(ctx.tenantId, p));
      }
      return ok({ results });
    }
    const result = await bookOne(ctx.tenantId, body as BookInput);
    return result.success ? ok(result) : fail(result.error ?? "Booking failed");
  },

  // Refresh a shipment's delivery status from the courier.
  "courier-track-parcel": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const shipmentId = typeof body.shipment_id === "string" ? body.shipment_id : "";
    if (!shipmentId) return fail("shipment_id is required");

    const shipment = sqlite
      .prepare(
        `SELECT id, courier, consignment_id, status FROM shipments
         WHERE id = ? AND tenant_id = ? LIMIT 1`,
      )
      .get(shipmentId, ctx.tenantId) as
      | { id: string; courier: string; consignment_id: string | null; status: string }
      | undefined;
    if (!shipment) return fail("Shipment not found");
    if (!shipment.consignment_id) return fail("Shipment has no consignment id to track");

    if (shipment.courier === "pathao") {
      const pathao = loadPathaoCreds(ctx.tenantId);
      if (!pathao) return fail("Pathao is not configured");
      try {
        const { status, raw } = await pathaoTrackOrder(pathao, shipment.consignment_id);
        const delivered = status.toLowerCase().includes("delivered");
        sqlite
          .prepare("UPDATE shipments SET status = ?, courier_response = ?, delivered_at = ?, updated_at = ? WHERE id = ?")
          .run(status, JSON.stringify(raw), delivered ? new Date().toISOString() : null, new Date().toISOString(), shipment.id);
        return ok({ success: true, status });
      } catch (err) {
        return fail(err instanceof Error ? err.message : "Tracking failed");
      }
    }
    if (shipment.courier !== "steadfast") return fail(`Tracking for "${shipment.courier}" is not available yet`);

    const creds = loadCreds(ctx.tenantId, "steadfast");
    if (!creds) return fail("Steadfast is not configured or inactive");

    try {
      const { status, raw } = await statusByConsignment(
        { apiKey: creds.apiKey, apiSecret: creds.apiSecret },
        shipment.consignment_id,
      );
      const delivered = status.toLowerCase() === "delivered";
      sqlite
        .prepare(
          `UPDATE shipments SET status = ?, courier_response = ?, delivered_at = ?, updated_at = ? WHERE id = ?`,
        )
        .run(
          status,
          JSON.stringify(raw),
          delivered ? new Date().toISOString() : null,
          new Date().toISOString(),
          shipment.id,
        );
      return ok({ success: true, status });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Tracking failed");
    }
  },
};
