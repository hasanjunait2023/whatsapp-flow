import { randomBytes } from "node:crypto";
import { dbGet, dbRun, dbTx } from "../db/raw.js";
import { encryptSecret, decryptSecret } from "../lib/crypto.js";
import { listProducts, verifyCreds, type WooCreds } from "../services/woocommerce/client.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * WooCommerce fn handlers — BYOK per tenant. Credentials live in
 * woocommerce_integrations (consumer_key/secret encrypted at rest, redacted
 * from /api/query). save-integration writes them; sync pulls products into the
 * local products table keyed by woo_product_id.
 */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

const fail = (message: string): FnResult => ({ data: null, error: { message } });
const ok = (data: unknown): FnResult => ({ data, error: null });

interface IntegrationRow {
  id: string;
  store_url: string;
  consumer_key_encrypted: string;
  consumer_secret_encrypted: string;
  is_active: boolean | null;
}

async function loadIntegration(tenantId: string): Promise<{ id: string; creds: WooCreds } | null> {
  const row = (await dbGet(
    `SELECT id, store_url, consumer_key_encrypted, consumer_secret_encrypted, is_active
         FROM woocommerce_integrations WHERE tenant_id = ? LIMIT 1`,
    tenantId,
  )) as IntegrationRow | undefined;
  if (!row || row.is_active === false) return null;
  return {
    id: row.id,
    creds: {
      storeUrl: row.store_url,
      consumerKey: decryptSecret(row.consumer_key_encrypted),
      consumerSecret: decryptSecret(row.consumer_secret_encrypted),
    },
  };
}

export const WOO_HANDLERS: Record<string, FnHandler> = {
  // Save/verify a tenant's WooCommerce store credentials (encrypted at rest).
  "woocommerce-save-integration": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const storeUrl = typeof body.store_url === "string" ? body.store_url.trim().replace(/\/+$/, "") : "";
    const key = typeof body.consumer_key === "string" ? body.consumer_key.trim() : "";
    const secret = typeof body.consumer_secret === "string" ? body.consumer_secret.trim() : "";
    if (!storeUrl) return fail("store_url is required");
    if (!/^https?:\/\//.test(storeUrl)) return fail("store_url must start with http(s)://");

    const existing = (await dbGet(
      "SELECT id, consumer_key_encrypted, consumer_secret_encrypted, settings FROM woocommerce_integrations WHERE tenant_id = ? LIMIT 1",
      ctx.tenantId,
    )) as
      | { id: string; consumer_key_encrypted: string; consumer_secret_encrypted: string; settings: string | null }
      | undefined;

    // Keep stored secrets when the form leaves them blank (they are redacted on read).
    const encKey = key ? encryptSecret(key) : existing?.consumer_key_encrypted;
    const encSecret = secret ? encryptSecret(secret) : existing?.consumer_secret_encrypted;
    if (!encKey || !encSecret) return fail("consumer_key and consumer_secret are required");

    // Verify the creds actually work before persisting (fail fast for the user).
    try {
      await verifyCreds({ storeUrl, consumerKey: decryptSecret(encKey), consumerSecret: decryptSecret(encSecret) });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Could not connect to the WooCommerce store");
    }

    // Merge settings + ensure a webhook_secret exists. The order webhook is
    // fail-closed (rejects without a valid HMAC), so every integration MUST have
    // a secret; the merchant pastes it into WooCommerce's webhook config.
    let settingsObj: Record<string, unknown> = {};
    try {
      settingsObj = existing?.settings
        ? typeof existing.settings === "string"
          ? JSON.parse(existing.settings)
          : (existing.settings as Record<string, unknown>)
        : {};
    } catch {
      settingsObj = {};
    }
    if (body.settings && typeof body.settings === "object") {
      settingsObj = { ...settingsObj, ...(body.settings as Record<string, unknown>) };
    }
    if (typeof settingsObj.webhook_secret !== "string" || !settingsObj.webhook_secret) {
      settingsObj.webhook_secret = randomBytes(32).toString("hex");
    }
    const settings = JSON.stringify(settingsObj);
    const webhookSecret = settingsObj.webhook_secret as string;

    const isActive = body.is_active === false ? false : true;
    const now = new Date().toISOString();
    if (existing) {
      await dbRun(
        `UPDATE woocommerce_integrations
             SET store_url = ?, consumer_key_encrypted = ?, consumer_secret_encrypted = ?,
                 is_active = ?, settings = ?, updated_at = ?
           WHERE id = ?`,
        storeUrl,
        encKey,
        encSecret,
        isActive,
        settings,
        now,
        existing.id,
      );
      return ok({ success: true, id: existing.id, webhook_secret: webhookSecret });
    }
    const id = crypto.randomUUID();
    await dbRun(
      `INSERT INTO woocommerce_integrations
           (id, tenant_id, store_url, consumer_key_encrypted, consumer_secret_encrypted, is_active, settings, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      ctx.tenantId,
      storeUrl,
      encKey,
      encSecret,
      isActive,
      settings,
      now,
      now,
    );
    return ok({ success: true, id, webhook_secret: webhookSecret });
  },

  // Pull products from the store into the local catalog (upsert by woo_product_id).
  "woocommerce-sync": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const integration = await loadIntegration(ctx.tenantId);
    if (!integration) return fail("WooCommerce is not configured or inactive");

    const logId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    await dbRun(
      `INSERT INTO woocommerce_sync_logs (id, integration_id, status, sync_type, started_at, products_synced, categories_synced)
         VALUES (?, ?, 'running', 'products', ?, 0, 0)`,
      logId,
      integration.id,
      startedAt,
    );

    try {
      const products = await listProducts(integration.creds);
      const upsertSql =
        `INSERT INTO products (id, tenant_id, name, sku, price, stock_quantity, description, images, is_active, woo_product_id, woo_last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`;
      // SQLite has no easy upsert-by-(tenant,woo_id) without a unique index, so
      // update-then-insert: update existing rows, insert new ones.
      const findExistingSql =
        "SELECT id FROM products WHERE tenant_id = ? AND woo_product_id = ? LIMIT 1";
      const updateSql =
        `UPDATE products SET name=?, sku=?, price=?, stock_quantity=?, description=?, images=?, is_active=?, woo_last_synced_at=? WHERE id=?`;
      const now = new Date().toISOString();
      let synced = 0;
      await dbTx(async (tx) => {
        for (const p of products) {
          const price = parseFloat(p.price || p.regular_price || "0") || 0;
          const images = JSON.stringify((p.images || []).map((i) => i.src));
          const isActive = p.status === "publish" ? true : false;
          const existing = (await tx.get(findExistingSql, ctx.tenantId, p.id)) as { id: string } | undefined;
          if (existing) {
            await tx.run(updateSql, p.name, p.sku || null, price, p.stock_quantity ?? 0, p.description || null, images, isActive, now, existing.id);
          } else {
            await tx.run(
              upsertSql,
              crypto.randomUUID(),
              ctx.tenantId,
              p.name,
              p.sku || null,
              price,
              p.stock_quantity ?? 0,
              p.description || null,
              images,
              isActive,
              p.id,
              now,
            );
          }
          synced++;
        }
      });

      await dbRun(
        "UPDATE woocommerce_sync_logs SET status='completed', products_synced=?, completed_at=? WHERE id=?",
        synced,
        now,
        logId,
      );
      await dbRun(
        "UPDATE woocommerce_integrations SET last_sync_at=?, sync_status='idle', sync_error=NULL WHERE id=?",
        now,
        integration.id,
      );
      return ok({ success: true, productsSynced: synced, categoriesSynced: 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await dbRun(
        "UPDATE woocommerce_sync_logs SET status='failed', errors=?, completed_at=? WHERE id=?",
        JSON.stringify([message]),
        new Date().toISOString(),
        logId,
      );
      await dbRun(
        "UPDATE woocommerce_integrations SET sync_status='error', sync_error=? WHERE id=?",
        message,
        integration.id,
      );
      return fail(message);
    }
  },
};
