import { sqlite } from "../../db/index.js";

/**
 * Subscription plan catalog seeding (idempotent).
 *
 * The `plans` table is the global pricing catalog read by the web pricing/onboarding
 * (usePlans -> SELECT * FROM plans WHERE is_active = 1) and enforced by the
 * instance/page/agent caps. It ships EMPTY, which blocks checkout, so this seed
 * populates the four production plans and is safe to re-run (upsert by id).
 *
 * --- Instance-count reconciliation (load-bearing) --------------------------------
 * The founder described plans by total connected channels: Starter=2, Pro=6,
 * Business=15. But "instance" is NOT one channel in this codebase — the caps count
 * two SEPARATE resources:
 *   - max_instances -> WhatsApp numbers. Enforced in routes/waha/session.ts by
 *     COUNT(*) over whatsapp_instances. The web also renders this as
 *     "{max_instances} WhatsApp Instance" (onboarding/PlanSelectionStep.tsx).
 *   - max_pages -> Facebook pages, each carrying an optional linked Instagram
 *     account. Enforced in services/facebook/oauth.ts (getTenantPageCap).
 *
 * So the founder's loose totals decompose onto the real columns as WhatsApp numbers
 * + Facebook pages (each FB page = Messenger + the linked IG inbox):
 *   Starter  "2"  = 1 WhatsApp  + 1 Facebook                  -> max_instances 1, max_pages 1
 *   Pro      "6"  = 2 WhatsApp  + 2 Facebook(+IG)             -> max_instances 2, max_pages 2  (WA2+FB2+IG2 = 6)
 *   Business "15" = 5 WhatsApp  + 5 Facebook(+IG)             -> max_instances 5, max_pages 5  (WA5+FB5+IG5 = 15)
 * This is the only mapping that both (a) honors the founder's literal per-plan
 * numbers and (b) matches how session.ts / oauth.ts actually count. The headline
 * channel totals are preserved in features.total_channels for display copy.
 *
 * max_agents maps to "Team Members" in the UI (PlanSelectionStep renders it as such).
 * Yearly price = 12x monthly minus 2 months (10x monthly => "2 months free").
 */

const YEARLY_MONTHS = 10;

export interface PlanSeed {
  id: string;
  name: string;
  description: string;
  price_monthly: number;
  /** Null only for contact-sales plans (Enterprise). */
  price_yearly: number | null;
  ai_enabled: boolean;
  max_instances: number;
  max_pages: number;
  max_agents: number;
  max_messages_per_month: number;
  tier: string;
  tier_order: number;
  features: Record<string, unknown>;
}

/** Yearly price for a monthly price: 10x => two months free. */
function yearly(monthly: number): number {
  return Math.round(monthly * YEARLY_MONTHS);
}

/**
 * The four production plans. Prices are BDT/month. `features` is the JSON flag bag
 * the web reads as Record<string, boolean | …> (usePlans Plan.features); contact-only
 * and display-only metadata live here too since there is no dedicated column.
 */
export const PLAN_SEEDS: PlanSeed[] = [
  {
    id: "starter",
    name: "Starter",
    description: "1 WhatsApp + 1 Facebook, 2 team members. Funnels & broadcast (basic).",
    price_monthly: 899,
    price_yearly: yearly(899),
    ai_enabled: false,
    max_instances: 1, // 1 WhatsApp number
    max_pages: 1, // 1 Facebook page (+ optional IG)
    max_agents: 2, // team members
    max_messages_per_month: 5000,
    tier: "starter",
    tier_order: 1,
    features: {
      total_channels: 2,
      funnels: "basic",
      broadcast: "basic",
      ai: false,
      fraud_check: false,
      contact_only: false,
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "2 WhatsApp + 2 Facebook/Instagram, 5 team members. AI, funnels & fraud-check on.",
    price_monthly: 1499,
    price_yearly: yearly(1499),
    ai_enabled: true,
    max_instances: 2, // WhatsApp x2
    max_pages: 2, // FB x2 (each with linked IG)
    max_agents: 5,
    max_messages_per_month: 25000,
    tier: "pro",
    tier_order: 2,
    features: {
      total_channels: 6,
      funnels: true,
      broadcast: true,
      ai: true,
      fraud_check: true,
      popular: true,
      contact_only: false,
    },
  },
  {
    id: "business",
    name: "Business",
    description: "5 WhatsApp + 5 Facebook/Instagram, 15 team members. Advanced AI, unlimited automation.",
    price_monthly: 2799,
    price_yearly: yearly(2799),
    ai_enabled: true,
    max_instances: 5, // WhatsApp x5
    max_pages: 5, // FB x5 (each with linked IG)
    max_agents: 15,
    max_messages_per_month: 100000,
    tier: "business",
    tier_order: 3,
    features: {
      total_channels: 15,
      funnels: true,
      broadcast: true,
      ai: "advanced",
      fraud_check: true,
      unlimited_automation: true,
      contact_only: false,
    },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits and pricing. Talk to sales.",
    price_monthly: 0,
    price_yearly: null, // negotiable
    ai_enabled: true,
    // Generous caps; the plan is provisioned manually after a sales conversation.
    max_instances: 1000,
    max_pages: 1000,
    max_agents: 1000,
    max_messages_per_month: 100000000,
    tier: "enterprise",
    tier_order: 4,
    features: {
      total_channels: null,
      funnels: true,
      broadcast: true,
      ai: "advanced",
      fraud_check: true,
      unlimited_automation: true,
      // Flags the card as "Contact sales" instead of a self-serve checkout CTA.
      contact_only: true,
    },
  },
];

/**
 * Upserts the four plans by id. Idempotent: re-running refreshes prices/limits
 * without duplicating rows or disturbing existing subscriptions (which reference
 * plan_id). created_at is preserved on conflict; updated_at is bumped.
 */
export function seedPlans(): void {
  const now = new Date().toISOString();
  const stmt = sqlite.prepare(
    `INSERT INTO plans
       (id, name, description, price_monthly, price_yearly, ai_enabled,
        max_instances, max_pages, max_agents, max_messages_per_month,
        tier, tier_order, features, is_active, created_at, updated_at)
     VALUES
       (@id, @name, @description, @price_monthly, @price_yearly, @ai_enabled,
        @max_instances, @max_pages, @max_agents, @max_messages_per_month,
        @tier, @tier_order, @features, 1, @now, @now)
     ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        price_monthly = excluded.price_monthly,
        price_yearly = excluded.price_yearly,
        ai_enabled = excluded.ai_enabled,
        max_instances = excluded.max_instances,
        max_pages = excluded.max_pages,
        max_agents = excluded.max_agents,
        max_messages_per_month = excluded.max_messages_per_month,
        tier = excluded.tier,
        tier_order = excluded.tier_order,
        features = excluded.features,
        is_active = 1,
        updated_at = excluded.updated_at`,
  );
  const run = sqlite.transaction((seeds: PlanSeed[]) => {
    for (const p of seeds) {
      stmt.run({
        id: p.id,
        name: p.name,
        description: p.description,
        price_monthly: p.price_monthly,
        price_yearly: p.price_yearly,
        ai_enabled: p.ai_enabled ? 1 : 0,
        max_instances: p.max_instances,
        max_pages: p.max_pages,
        max_agents: p.max_agents,
        max_messages_per_month: p.max_messages_per_month,
        tier: p.tier,
        tier_order: p.tier_order,
        features: JSON.stringify(p.features),
        now,
      });
    }
  });
  run(PLAN_SEEDS);
}

/** Seeds the catalog only when the plans table is empty (boot-safe, cheap). */
export function seedPlansIfEmpty(): void {
  const row = sqlite.prepare("SELECT COUNT(*) AS n FROM plans").get() as { n: number };
  if (row.n === 0) {
    seedPlans();
  }
}
