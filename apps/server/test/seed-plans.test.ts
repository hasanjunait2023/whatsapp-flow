import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { useTempDb } from "./helpers.js";

useTempDb();

const { db, sqlite } = await import("../src/db/index.js");
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
  ai_enabled: number;
  is_active: number;
  features: string | null;
}

function allPlans(): PlanRow[] {
  return sqlite.prepare("SELECT * FROM plans ORDER BY tier_order").all() as PlanRow[];
}

function plan(id: string): PlanRow {
  return sqlite.prepare("SELECT * FROM plans WHERE id = ?").get(id) as PlanRow;
}

beforeAll(() => {
  runMigrations();
});

beforeEach(() => {
  db.delete(plans).run();
});

describe("seedPlans", () => {
  it("seeds exactly the four catalog plans", () => {
    seedPlans();
    const rows = allPlans();
    expect(rows.map((r) => r.id)).toEqual(["starter", "pro", "business", "enterprise"]);
    expect(rows).toHaveLength(4);
  });

  it("seeds the agreed prices and yearly = 10x monthly (2 months free)", () => {
    seedPlans();
    expect(plan("starter").price_monthly).toBe(899);
    expect(plan("pro").price_monthly).toBe(1499);
    expect(plan("business").price_monthly).toBe(2799);
    // Yearly is ten months of the monthly price.
    expect(plan("starter").price_yearly).toBe(8990);
    expect(plan("pro").price_yearly).toBe(14990);
    expect(plan("business").price_yearly).toBe(27990);
  });

  it("reconciles caps: max_instances=WhatsApp numbers, max_pages=Facebook pages", () => {
    seedPlans();
    // Founder's loose channel totals (2 / 6 / 15) split onto the real columns.
    expect(plan("starter").max_instances).toBe(1);
    expect(plan("starter").max_pages).toBe(1);

    expect(plan("pro").max_instances).toBe(2);
    expect(plan("pro").max_pages).toBe(2);

    expect(plan("business").max_instances).toBe(5);
    expect(plan("business").max_pages).toBe(5);

    // Display total_channels preserves the headline counts.
    expect(JSON.parse(plan("starter").features!).total_channels).toBe(2);
    expect(JSON.parse(plan("pro").features!).total_channels).toBe(6);
    expect(JSON.parse(plan("business").features!).total_channels).toBe(15);
  });

  it("sets team-member (max_agents) and AI flags per tier", () => {
    seedPlans();
    expect(plan("starter").max_agents).toBe(2);
    expect(plan("pro").max_agents).toBe(5);
    expect(plan("business").max_agents).toBe(15);

    expect(plan("starter").ai_enabled).toBe(0);
    expect(plan("pro").ai_enabled).toBe(1);
    expect(plan("business").ai_enabled).toBe(1);

    expect(JSON.parse(plan("pro").features!).popular).toBe(true);
  });

  it("marks enterprise as active, contact-only, with null negotiable yearly price", () => {
    seedPlans();
    const ent = plan("enterprise");
    expect(ent.is_active).toBe(1);
    expect(ent.price_monthly).toBe(0);
    expect(ent.price_yearly).toBeNull();
    expect(JSON.parse(ent.features!).contact_only).toBe(true);
  });

  it("all seeded plans are active so the web pricing query returns them", () => {
    seedPlans();
    const active = sqlite
      .prepare("SELECT COUNT(*) AS n FROM plans WHERE is_active = 1")
      .get() as { n: number };
    expect(active.n).toBe(PLAN_SEEDS.length);
  });

  it("is idempotent: re-running upserts in place without duplicating rows", () => {
    seedPlans();
    // Mutate a row, then re-seed; the upsert should restore the catalog price.
    sqlite.prepare("UPDATE plans SET price_monthly = 1 WHERE id = 'pro'").run();
    seedPlans();
    expect(allPlans()).toHaveLength(4);
    expect(plan("pro").price_monthly).toBe(1499);
  });
});

describe("seedPlansIfEmpty", () => {
  it("seeds when the table is empty", () => {
    seedPlansIfEmpty();
    expect(allPlans()).toHaveLength(4);
  });

  it("does NOT overwrite an existing catalog", () => {
    seedPlans();
    sqlite.prepare("UPDATE plans SET price_monthly = 42 WHERE id = 'pro'").run();
    seedPlansIfEmpty(); // table is non-empty -> no-op
    expect(plan("pro").price_monthly).toBe(42);
  });
});
