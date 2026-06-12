import { sqlite } from "../../db/index.js";

/**
 * Free-trial provisioning for brand-new tenants.
 *
 * A new tenant is created via POST /api/query (op:insert, table:tenants) from the
 * web onboarding (useTenantState.createTenant). There is no server fn in that path,
 * so the trial is started here, invoked from query-exec.runInsert right after the
 * tenants row lands.
 *
 * Policy: every new tenant gets a 5-day Pro trial (status 'trialing', plan_id 'pro')
 * so activation is driven by the full feature set. The existing gating already treats
 * 'trialing' as active — instance/page/agent caps include it (status IN
 * ('active','trialing','past_due')) and the web useSubscription derives
 * canSendMessages/canUseAI from it.
 */

const TRIAL_DAYS = 5;
const TRIAL_PLAN_ID = "pro";

/** Adds whole days to a Date, returning a new Date (no mutation). */
function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Creates a 5-day trialing Pro subscription for the tenant if it has none yet.
 * Idempotent: a tenant that already has a subscription row is left untouched, so
 * re-runs / re-inserts never double-provision. Best-effort — a failure here must
 * not break tenant creation, so callers run it defensively.
 */
export function startTrialForTenant(tenantId: string): void {
  if (!tenantId) return;

  const existing = sqlite
    .prepare("SELECT 1 FROM subscriptions WHERE tenant_id = ? LIMIT 1")
    .get(tenantId);
  if (existing) return;

  // Don't trial against a plan that isn't in the catalog (e.g. seed not run yet).
  const plan = sqlite
    .prepare("SELECT 1 FROM plans WHERE id = ? LIMIT 1")
    .get(TRIAL_PLAN_ID);
  if (!plan) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const endIso = addDays(now, TRIAL_DAYS).toISOString();

  sqlite
    .prepare(
      `INSERT INTO subscriptions
         (id, tenant_id, plan_id, status, current_period_start, current_period_end,
          trial_ends_at, created_at, updated_at)
       VALUES (?, ?, ?, 'trialing', ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      tenantId,
      TRIAL_PLAN_ID,
      nowIso,
      endIso,
      endIso,
      nowIso,
      nowIso,
    );
}
