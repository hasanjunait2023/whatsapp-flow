import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { tenants, subscriptions } = await import("../src/db/schema.js");
const { seedPlans } = await import("../src/services/billing/seed-plans.js");
const { startTrialForTenant } = await import("../src/services/billing/trial.js");
const { executeQuery } = await import("../src/routes/query-exec.js");
import type { TenantContext } from "../src/middleware/tenant.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface SubRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
}

function subFor(tenantId: string): SubRow | undefined {
  return sqlite
    .prepare("SELECT * FROM subscriptions WHERE tenant_id = ? LIMIT 1")
    .get(tenantId) as SubRow | undefined;
}

/**
 * A brand-new owner mid-onboarding: authenticated, but no active tenant yet
 * (no user_roles row exists until after the tenant is created). This is the real
 * production path — useTenantState.createTenant inserts the tenants row first.
 */
function newUserCtx(userId: string): TenantContext {
  return { userId, tenantId: null, isAdmin: false, isImpersonating: false };
}

beforeAll(() => {
  runMigrations();
});

beforeEach(() => {
  db.delete(subscriptions).run();
  db.delete(tenants).run();
  seedPlans();
});

describe("startTrialForTenant", () => {
  it("creates a 5-day trialing Pro subscription", () => {
    const tenantId = "tnt-trial-1";
    db.insert(tenants).values({ id: tenantId, name: "Trial Co", owner_id: "owner-1" }).run();

    const before = Date.now();
    startTrialForTenant(tenantId);
    const after = Date.now();

    const sub = subFor(tenantId);
    expect(sub).toBeDefined();
    expect(sub!.status).toBe("trialing");
    expect(sub!.plan_id).toBe("pro");
    expect(sub!.trial_ends_at).not.toBeNull();

    // trial_ends_at ≈ now + 5 days (and equals current_period_end).
    const trialEnds = new Date(sub!.trial_ends_at!).getTime();
    expect(trialEnds).toBeGreaterThanOrEqual(before + 5 * DAY_MS - 1000);
    expect(trialEnds).toBeLessThanOrEqual(after + 5 * DAY_MS + 1000);
    expect(sub!.current_period_end).toBe(sub!.trial_ends_at);

    const periodStart = new Date(sub!.current_period_start).getTime();
    expect(periodStart).toBeGreaterThanOrEqual(before - 1000);
    expect(periodStart).toBeLessThanOrEqual(after + 1000);
  });

  it("is idempotent: never double-provisions for the same tenant", () => {
    const tenantId = "tnt-trial-2";
    db.insert(tenants).values({ id: tenantId, name: "Dup Co", owner_id: "owner-2" }).run();

    startTrialForTenant(tenantId);
    startTrialForTenant(tenantId);

    const count = sqlite
      .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE tenant_id = ?")
      .get(tenantId) as { n: number };
    expect(count.n).toBe(1);
  });

  it("does not provision when the pro plan is absent (e.g. catalog not seeded)", () => {
    db.delete(subscriptions).run();
    db.delete(tenants).run();
    sqlite.prepare("DELETE FROM plans").run(); // remove the catalog entirely

    const tenantId = "tnt-trial-3";
    db.insert(tenants).values({ id: tenantId, name: "No Plan Co", owner_id: "owner-3" }).run();
    startTrialForTenant(tenantId);
    expect(subFor(tenantId)).toBeUndefined();
  });
});

describe("tenant creation via /api/query starts the trial", () => {
  it("lets a brand-new user (no active tenant) create their first tenant", async () => {
    const res = await executeQuery(
      {
        table: "tenants",
        op: "insert",
        values: { name: "First Co", owner_id: "first-owner", slug: "first-co" },
        returning: true,
        single: true,
      },
      newUserCtx("first-owner"),
    );
    expect(res.error).toBeNull();
    expect((res.data as { id: string }).id).toBeDefined();
  });

  it("auto-creates a trialing Pro subscription on tenants insert", async () => {
    const res = await executeQuery(
      {
        table: "tenants",
        op: "insert",
        values: { name: "Onboarded Co", owner_id: "owner-x", slug: "onboarded-co" },
        returning: true,
        single: true,
      },
      newUserCtx("owner-x"),
    );

    expect(res.error).toBeNull();
    const created = res.data as { id: string };
    expect(created.id).toBeDefined();

    const sub = subFor(created.id);
    expect(sub).toBeDefined();
    expect(sub!.status).toBe("trialing");
    expect(sub!.plan_id).toBe("pro");
    const trialEnds = new Date(sub!.trial_ends_at!).getTime();
    expect(trialEnds).toBeGreaterThan(Date.now() + 4 * DAY_MS);
    expect(trialEnds).toBeLessThan(Date.now() + 6 * DAY_MS);
  });

  it("does not create a subscription for non-tenant inserts", async () => {
    // Insert a tenant first so there's an active tenant for a scoped insert.
    db.insert(tenants).values({ id: "tnt-q", name: "Q Co", owner_id: "owner-q" }).run();
    const ctx: TenantContext = {
      userId: "owner-q",
      tenantId: "tnt-q",
      isAdmin: false,
      isImpersonating: false,
    };
    const subsBefore = sqlite.prepare("SELECT COUNT(*) AS n FROM subscriptions").get() as { n: number };

    await executeQuery(
      {
        table: "contacts",
        op: "insert",
        values: { name: "Someone", phone_number: "8801700000000", wa_id: "8801700000000@s.whatsapp.net" },
        returning: true,
      },
      ctx,
    );

    const subsAfter = sqlite.prepare("SELECT COUNT(*) AS n FROM subscriptions").get() as { n: number };
    expect(subsAfter.n).toBe(subsBefore.n);
  });
});
