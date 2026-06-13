import { dbGet, dbRun, dbTx } from "../../db/raw.js";

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
 * Provisions a brand-new tenant for its creating user: makes them the OWNER and
 * starts the trial. This MUST run server-side because user_roles is admin-only
 * mutable via /api/query — a regular onboarding user cannot grant themselves a
 * role from the client, so without this they'd create a tenant they can't access
 * ("Forbidden tenant" on every read). Best-effort + idempotent.
 */
export async function provisionNewTenant(tenantId: string, ownerUserId: string): Promise<void> {
  if (!tenantId || !ownerUserId) return;
  const nowIso = new Date().toISOString();
  // Owner membership (idempotent on the (user_id, tenant_id) unique index).
  await dbRun(
    `INSERT INTO user_roles (id, user_id, tenant_id, role, created_at, updated_at)
       VALUES (?, ?, ?, 'owner', ?, ?)
       ON CONFLICT (user_id, tenant_id) DO NOTHING`,
    crypto.randomUUID(),
    ownerUserId,
    tenantId,
    nowIso,
    nowIso,
  );
  await startTrialForTenant(tenantId);
}

/**
 * Creates a 5-day trialing Pro subscription for the tenant if it has none yet.
 * Idempotent: a tenant that already has a subscription row is left untouched, so
 * re-runs / re-inserts never double-provision. Best-effort — a failure here must
 * not break tenant creation, so callers run it defensively.
 */
export async function startTrialForTenant(tenantId: string): Promise<void> {
  if (!tenantId) return;

  const existing = await dbGet("SELECT 1 FROM subscriptions WHERE tenant_id = ? LIMIT 1", tenantId);
  if (existing) return;

  // Don't trial against a plan that isn't in the catalog (e.g. seed not run yet).
  const plan = await dbGet("SELECT 1 FROM plans WHERE id = ? LIMIT 1", TRIAL_PLAN_ID);
  if (!plan) return;

  const now = new Date();
  const nowIso = now.toISOString();
  const endIso = addDays(now, TRIAL_DAYS).toISOString();

  // Provision the trial AND activate the tenant in one transaction: a trial means
  // immediate full access, so the new tenant goes straight to their panel instead
  // of the /pending-activation "complete payment to activate" gate.
  await dbTx(async (tx) => {
    await tx.run(
      `INSERT INTO subscriptions
         (id, tenant_id, plan_id, status, current_period_start, current_period_end,
          trial_ends_at, created_at, updated_at)
       VALUES (?, ?, ?, 'trialing', ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      tenantId,
      TRIAL_PLAN_ID,
      nowIso,
      endIso,
      endIso,
      nowIso,
      nowIso,
    );

    await tx.run(
      `UPDATE tenants
         SET is_activated = true, activated_at = ?, updated_at = ?
       WHERE id = ? AND (is_activated IS NOT TRUE)`,
      nowIso,
      nowIso,
      tenantId,
    );
  });
}
