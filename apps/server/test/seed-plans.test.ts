import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db } = await import("../src/db/index.js");
const { dbGet, dbAll, dbRun } = await import("../src/db/raw.js");
const { runMigrations } = await import("../src/db/migrate.js");
const { plans } = await import("../src/db/schema.js");
const { seedPlans, seedPlansIfEmpty, PLAN_SEEDS } = await import(
  "../src/services/billing/seed-plans.js"
);

interface PlanRow {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_instances: number;
  max_pages: number;
  max_agents: number;
  ai_enabled: boolean;
  is_active: boolean;
  // jsonb column: Postgres/PGlite returns it already parsed as an object.
  features: Record<string, unknown> | null;
}

// `features` is jsonb: PGlite returns an object, but tolerate a string too.
function featuresOf(row: PlanRow): Record<string, unknown> {
  const f = row.features as unknown;
  return (typeof f === "string" ? JSON.parse(f) : f) as Record<string, unknown>;
}

function allPlans(): Promise<PlanRow[]> {
  return dbAll<PlanRow>("SELECT * FROM plans ORDER BY tier_order");
}

async function plan(id: string): Promise<PlanRow> {
  return (await dbGet<PlanRow>("SELECT * FROM plans WHERE id = ?", id)) as PlanRow;
}

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await db.delete(plans);
});

describe("seedPlans", () => {
  it("seeds exactly the four catalog plans", async () => {
    await seedPlans();
    const rows = await allPlans();
    expect(rows.map((r) => r.id)).toEqual(["starter", "pro", "business", "enterprise"]);
    expect(rows).toHaveLength(4);
  });

  it("seeds the agreed prices and yearly = 10x monthly (2 months free)", async () => {
    await seedPlans();
    expect((await plan("starter")).price_monthly).toBe(899);
    expect((await plan("pro")).price_monthly).toBe(1499);
    expect((await plan("business")).price_monthly).toBe(2799);
    // Yearly is ten months of the monthly price.
    expect((await plan("starter")).price_yearly).toBe(8990);
    expect((await plan("pro")).price_yearly).toBe(14990);
    expect((await plan("business")).price_yearly).toBe(27990);
  });

  it("reconciles caps: max_instances=WhatsApp numbers, max_pages=Facebook pages", async () => {
    await seedPlans();
    // Founder's loose channel totals (2 / 6 / 15) split onto the real columns.
    expect((await plan("starter")).max_instances).toBe(1);
    expect((await plan("starter")).max_pages).toBe(1);

    expect((await plan("pro")).max_instances).toBe(2);
    expect((await plan("pro")).max_pages).toBe(2);

    expect((await plan("business")).max_instances).toBe(5);
    expect((await plan("business")).max_pages).toBe(5);

    // Display total_channels preserves the headline counts.
    expect(featuresOf(await plan("starter")).total_channels).toBe(2);
    expect(featuresOf(await plan("pro")).total_channels).toBe(6);
    expect(featuresOf(await plan("business")).total_channels).toBe(15);
  });

  it("sets team-member (max_agents) and AI flags per tier", async () => {
    await seedPlans();
    expect((await plan("starter")).max_agents).toBe(2);
    expect((await plan("pro")).max_agents).toBe(5);
    expect((await plan("business")).max_agents).toBe(15);

    expect((await plan("starter")).ai_enabled).toBe(false);
    expect((await plan("pro")).ai_enabled).toBe(true);
    expect((await plan("business")).ai_enabled).toBe(true);

    expect(featuresOf(await plan("pro")).popular).toBe(true);
  });

  it("marks enterprise as active, contact-only, with null negotiable yearly price", async () => {
    await seedPlans();
    const ent = await plan("enterprise");
    expect(ent.is_active).toBe(true);
    expect(ent.price_monthly).toBe(0);
    expect(ent.price_yearly).toBeNull();
    expect(featuresOf(ent).contact_only).toBe(true);
  });

  it("all seeded plans are active so the web pricing query returns them", async () => {
    await seedPlans();
    const active = (await dbGet(
      "SELECT COUNT(*)::int AS n FROM plans WHERE is_active = true",
    )) as { n: number };
    expect(active.n).toBe(PLAN_SEEDS.length);
  });

  it("is idempotent: re-running upserts in place without duplicating rows", async () => {
    await seedPlans();
    // Mutate a row, then re-seed; the upsert should restore the catalog price.
    await dbRun("UPDATE plans SET price_monthly = 1 WHERE id = 'pro'");
    await seedPlans();
    expect(await allPlans()).toHaveLength(4);
    expect((await plan("pro")).price_monthly).toBe(1499);
  });
});

describe("seedPlansIfEmpty", () => {
  it("seeds when the table is empty", async () => {
    await seedPlansIfEmpty();
    expect(await allPlans()).toHaveLength(4);
  });

  it("does NOT overwrite an existing catalog", async () => {
    await seedPlans();
    await dbRun("UPDATE plans SET price_monthly = 42 WHERE id = 'pro'");
    await seedPlansIfEmpty(); // table is non-empty -> no-op
    expect((await plan("pro")).price_monthly).toBe(42);
  });
});
