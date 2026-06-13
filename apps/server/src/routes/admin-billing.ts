import { Hono } from "hono";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { coupons, cryptoPaymentRequests } from "../db/schema.js";
import { getTenant } from "../middleware/tenant.js";
import { approveCryptoPayment, rejectCryptoPayment } from "../services/payments/crypto.js";

/**
 * Admin-only billing operations: crypto payment approval queue and coupon CRUD.
 * Coupons are deliberately NOT in the generic /api/query allowlist (codes must
 * not be enumerable by tenants); this router is the only read/write path.
 */
export const adminBillingRoute = new Hono();

adminBillingRoute.use("*", async (c, next) => {
  const ctx = getTenant(c);
  if (!ctx.isAdmin) {
    return c.json({ error: "Admin privileges required" }, 403);
  }
  await next();
});

// --- crypto approval queue ---------------------------------------------------

adminBillingRoute.get("/crypto/requests", async (c) => {
  const status = c.req.query("status") ?? "submitted";
  const rows = await db
    .select()
    .from(cryptoPaymentRequests)
    .where(eq(cryptoPaymentRequests.status, status))
    .orderBy(desc(cryptoPaymentRequests.submitted_at))
    .limit(100);
  return c.json({ data: rows, error: null });
});

adminBillingRoute.post("/crypto/requests/:id/approve", async (c) => {
  const ctx = getTenant(c);
  let note: string | undefined;
  try {
    const body = (await c.req.json().catch(() => ({}))) as { note?: string };
    note = body.note;
  } catch {
    // empty body is fine
  }
  try {
    await approveCryptoPayment(c.req.param("id"), { adminUserId: ctx.userId, note });
    return c.json({ data: { success: true }, error: null });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "approval failed" }, 400);
  }
});

adminBillingRoute.post("/crypto/requests/:id/reject", async (c) => {
  const ctx = getTenant(c);
  let note: string | undefined;
  try {
    const body = (await c.req.json().catch(() => ({}))) as { note?: string };
    note = body.note;
  } catch {
    // empty body is fine
  }
  try {
    await rejectCryptoPayment(c.req.param("id"), { adminUserId: ctx.userId, note });
    return c.json({ data: { success: true }, error: null });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "rejection failed" }, 400);
  }
});

// --- coupon CRUD ---------------------------------------------------------------

interface CouponBody {
  code?: string;
  discount_type?: string;
  value?: number;
  max_uses?: number | null;
  expires_at?: string | null;
  plan_ids?: string[] | null;
  is_active?: boolean;
  note?: string | null;
}

function validateCouponBody(body: CouponBody, partial: boolean): string | null {
  if (!partial || body.code !== undefined) {
    if (!body.code || !/^[A-Z0-9_-]{3,32}$/i.test(body.code)) {
      return "code must be 3-32 chars (letters, numbers, - _)";
    }
  }
  if (!partial || body.discount_type !== undefined) {
    if (body.discount_type !== "percent" && body.discount_type !== "fixed_usd") {
      return "discount_type must be percent or fixed_usd";
    }
  }
  if (!partial || body.value !== undefined) {
    if (typeof body.value !== "number" || body.value <= 0) {
      return "value must be a positive number";
    }
    if (body.discount_type === "percent" && body.value > 100) {
      return "percent value cannot exceed 100";
    }
  }
  if (body.max_uses != null && (!Number.isInteger(body.max_uses) || body.max_uses < 1)) {
    return "max_uses must be a positive integer";
  }
  return null;
}

adminBillingRoute.get("/coupons", async (c) => {
  const rows = await db.select().from(coupons).orderBy(desc(coupons.created_at)).limit(200);
  return c.json({ data: rows, error: null });
});

adminBillingRoute.post("/coupons", async (c) => {
  const ctx = getTenant(c);
  let body: CouponBody;
  try {
    body = (await c.req.json()) as CouponBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const validationError = validateCouponBody(body, false);
  if (validationError) return c.json({ error: validationError }, 400);

  try {
    const inserted = await db
      .insert(coupons)
      .values({
        code: body.code!.toUpperCase(),
        discount_type: body.discount_type!,
        value: body.value!,
        max_uses: body.max_uses ?? null,
        expires_at: body.expires_at ?? null,
        plan_ids: body.plan_ids ?? null,
        is_active: body.is_active ?? true,
        note: body.note ?? null,
        created_by: ctx.userId,
      })
      .returning();
    return c.json({ data: inserted[0], error: null });
  } catch (err) {
    if (err instanceof Error && /unique|duplicate key/i.test(err.message)) {
      return c.json({ error: "A coupon with this code already exists" }, 409);
    }
    throw err;
  }
});

adminBillingRoute.patch("/coupons/:id", async (c) => {
  let body: CouponBody;
  try {
    body = (await c.req.json()) as CouponBody;
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  const validationError = validateCouponBody(body, true);
  if (validationError) return c.json({ error: validationError }, 400);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.code !== undefined) patch.code = body.code.toUpperCase();
  if (body.discount_type !== undefined) patch.discount_type = body.discount_type;
  if (body.value !== undefined) patch.value = body.value;
  if (body.max_uses !== undefined) patch.max_uses = body.max_uses;
  if (body.expires_at !== undefined) patch.expires_at = body.expires_at;
  if (body.plan_ids !== undefined) patch.plan_ids = body.plan_ids;
  if (body.is_active !== undefined) patch.is_active = body.is_active;
  if (body.note !== undefined) patch.note = body.note;

  const updated = await db
    .update(coupons)
    .set(patch)
    .where(eq(coupons.id, c.req.param("id")))
    .returning();
  if (updated.length === 0) return c.json({ error: "Coupon not found" }, 404);
  return c.json({ data: updated[0], error: null });
});

adminBillingRoute.delete("/coupons/:id", async (c) => {
  const deleted = await db
    .delete(coupons)
    .where(eq(coupons.id, c.req.param("id")))
    .returning({ id: coupons.id });
  if (deleted.length === 0) return c.json({ error: "Coupon not found" }, 404);
  return c.json({ data: { success: true }, error: null });
});
