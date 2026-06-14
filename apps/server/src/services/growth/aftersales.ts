import { dbGet, dbAll, dbRun } from "../../db/raw.js";
import { registerJobHandler } from "../../jobs/queue.js";
import {
  queueApproval,
  claimApprovalForExecution,
  markApprovalExecuted,
} from "./approvals.js";
import { sendOwnerMessage, type ChannelsPolicy } from "./owner-messaging.js";
import { notify } from "../notify.js";
import { GROWTH_TELEGRAM_CHAT_ID } from "../../lib/env.js";
import { sendTelegramMessage, escapeTelegramMarkdown } from "../telegram.js";
import {
  AFTERSALES_CAMPAIGN_TYPE,
  AFTERSALES_ENTITY_TYPE,
  ONBOARDING_CAMPAIGN_KEY,
  getAftersalesCampaign,
  type AftersalesStep,
} from "./aftersales-campaigns.js";

/**
 * M4 AFTER-SALES engine. Three concerns:
 *
 *   1. enrollTenantInAftersales(): hook on subscription-activation. Enrolls the
 *      tenant into the onboarding campaign (entity_type='tenant'), idempotent on
 *      (campaign_id, entity_id). Best-effort; never throws back into payment.
 *
 *   2. TEMPLATE-APPROVE-ONCE: a sequence step's template is approved by the
 *      founder ONCE via the gate. ensureTemplateApproved() returns true when the
 *      step is already approved; otherwise it queues ONE approval (deduped) and
 *      returns false. The founder ✅ runs APPROVE_AFTERSALES_TEMPLATE_JOB, which
 *      flips the sequence row's `approved` flag. Approved steps then auto-send.
 *
 *   3. advanceAftersales(): a guarded, idempotent, per-run-capped daily tick that
 *      reads tenant stats / orders / subscription age to fire milestones,
 *      trial-ending, usage-dip, anniversary, and ascension touches. Approved
 *      templates auto-send via sendOwnerMessage; unapproved ones queue an
 *      approval and skip. Detractor/at-risk/no-activation route to a HUMAN task.
 */

export const APPROVE_AFTERSALES_TEMPLATE_JOB = "approve_aftersales_template";

/** Max distinct (tenant, touch) auto-sends per advance tick — keeps blast bounded. */
export const AFTERSALES_SEND_PER_RUN_CAP = 25;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Milestone thresholds (from STRATEGY §5 + the touch map) ----------------
const FIRST_100_ORDERS = 100;
const SNAPSHOT_DAY = 30;
const TRIAL_ENDING_DAYS = [4, 5];
const ANNIVERSARY_DAYS = [30, 182, 365]; // 1mo / 6mo / 1yr
const ASCENSION_ORDERS_PER_DAY = 80; // Starter -> Pro (STRATEGY §5)
const USAGE_DIP_LOOKBACK_DAYS = 7;

interface SequenceRow {
  id: string;
  campaign_id: string;
  step_order: number;
  channel: string;
  approved: boolean | null;
  approval_id: string | null;
}

interface CampaignRow {
  id: string;
}

// ---------------------------------------------------------------------------
// 1. Enroll-on-payment
// ---------------------------------------------------------------------------

/** Looks up an after-sales campaign id by its stable key. Null if not seeded. */
async function getCampaignId(key: string): Promise<string | null> {
  const row = (await dbGet(
    `SELECT id FROM admin_marketing_campaigns WHERE name = ? AND type = ? LIMIT 1`,
    key,
    AFTERSALES_CAMPAIGN_TYPE,
  )) as CampaignRow | undefined;
  return row?.id ?? null;
}

/**
 * Enrolls a tenant into the onboarding campaign when their subscription becomes
 * active. Idempotent on (campaign_id, entity_id): a re-activation/renewal does
 * not duplicate. No-ops silently when the campaign isn't seeded — activation must
 * never fail because the campaign hasn't been provisioned.
 */
export async function enrollTenantInAftersales(
  tenantId: string,
  campaignKey: string = ONBOARDING_CAMPAIGN_KEY,
): Promise<string | null> {
  const campaignId = await getCampaignId(campaignKey);
  if (!campaignId) return null;

  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_enrollments
      WHERE campaign_id = ? AND entity_type = ? AND entity_id = ? LIMIT 1`,
    campaignId,
    AFTERSALES_ENTITY_TYPE,
    tenantId,
  )) as { id: string } | undefined;
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await dbRun(
    `INSERT INTO admin_marketing_enrollments
       (id, campaign_id, entity_type, entity_id, status, current_step, current_week,
        enrolled_at, next_message_at, messages_this_week, messages_this_month,
        week_reset_at, month_reset_at)
     VALUES (?, ?, ?, ?, 'active', 0, 1, ?, ?, 0, 0, ?, ?)`,
    id,
    campaignId,
    AFTERSALES_ENTITY_TYPE,
    tenantId,
    now,
    now,
    now,
    now,
  );
  return id;
}

// ---------------------------------------------------------------------------
// 2. Template-approve-once
// ---------------------------------------------------------------------------

/** Loads the seeded sequence row for a campaign key + step order. */
async function getSequenceRow(campaignKey: string, stepOrder: number): Promise<SequenceRow | null> {
  const campaignId = await getCampaignId(campaignKey);
  if (!campaignId) return null;
  const row = (await dbGet(
    `SELECT s.id, s.campaign_id, s.step_order, s.channel, s.approved, s.approval_id
       FROM admin_marketing_sequences s
      WHERE s.campaign_id = ? AND s.step_order = ? LIMIT 1`,
    campaignId,
    stepOrder,
  )) as SequenceRow | undefined;
  return row ?? null;
}

/**
 * TEMPLATE-APPROVE-ONCE gate. Returns true when the step's template is already
 * approved (auto-send allowed). Otherwise queues ONE approval through the M1 gate
 * (deduped: if a live awaiting/approved approval already references this sequence,
 * no new card is queued) and returns false so the caller skips sending.
 */
export async function ensureTemplateApproved(
  campaignKey: string,
  step: AftersalesStep,
): Promise<boolean> {
  const seq = await getSequenceRow(campaignKey, step.stepOrder);
  if (!seq) return false; // not seeded -> cannot send
  if (seq.approved) return true;

  // Dedupe: skip queuing if this sequence already has a non-terminal approval.
  if (seq.approval_id) {
    const live = (await dbGet(
      `SELECT id FROM growth_approvals
        WHERE id = ? AND status IN ('awaiting_approval', 'approved', 'executing') LIMIT 1`,
      seq.approval_id,
    )) as { id: string } | undefined;
    if (live) return false;
  }

  const approvalId = await queueApproval({
    artifactType: "aftersales_template",
    artifactId: seq.id,
    summary: `[aftersales template] ${campaignKey} / ${step.name} (${step.channels.join("+")})`,
    payload: { sequenceId: seq.id, campaignKey, stepOrder: step.stepOrder, name: step.name },
    executeJobKind: APPROVE_AFTERSALES_TEMPLATE_JOB,
  });
  await dbRun(
    `UPDATE admin_marketing_sequences SET approval_id = ? WHERE id = ?`,
    approvalId,
    seq.id,
  );
  return false;
}

interface ApproveTemplatePayload {
  sequenceId: string;
}

/**
 * Execution handler for the template approval. Founder ✅ enqueues this; it flips
 * the sequence row's `approved` flag so future ticks auto-send the step. The
 * claim guard + markApprovalExecuted make a queue retry a safe no-op.
 */
async function runApproveAftersalesTemplate(payload: unknown): Promise<void> {
  const { approvalId } = payload as { approvalId: string };
  const approval = await claimApprovalForExecution(approvalId);
  if (!approval) return;

  try {
    const data = approval.payload as ApproveTemplatePayload;
    await dbRun(
      `UPDATE admin_marketing_sequences SET approved = true WHERE id = ?`,
      data.sequenceId,
    );
    await markApprovalExecuted(approvalId, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : "template approval failed";
    await markApprovalExecuted(approvalId, false, message);
    throw err;
  }
}

/**
 * Auto-sends a step IF its template is approved, then stamps a tenant-scoped
 * dedupe marker so the same one-off touch isn't re-evaluated by a later tick.
 * Returns true when delivered (or stub-pending), false when gated (an approval
 * was queued) or blocked by consent/quiet-hours/cap. The single send path used
 * by every behaviour trigger, so gating + routing are enforced in one place.
 */
async function sendApprovedStep(
  tenantId: string,
  campaignKey: string,
  step: AftersalesStep,
): Promise<boolean> {
  const approved = await ensureTemplateApproved(campaignKey, step);
  if (!approved) return false; // unapproved -> approval queued, skip send

  const policy: ChannelsPolicy = { channels: step.channels, mode: step.channelMode };
  const result = await sendOwnerMessage(tenantId, {
    event: `${campaignKey}:${step.name}`,
    title: step.title,
    bodyEn: step.bodyEn,
    bodyBn: step.bodyBn,
    channelsPolicy: policy,
    sequenceStep: step.stepOrder,
  });

  const ok = result.delivered || result.results.some((r) => r.outcome === "pending");
  if (ok) await markFired(tenantId, `${campaignKey}:${step.name}`, step.stepOrder);
  return ok;
}

/**
 * Stamps a tenant-scoped dedupe marker row (status 'sent', enrollment_id
 * 'aftersales-marker') so alreadyFired() finds this touch per tenant. Separate
 * from the router's per-channel send rows, which aren't tenant-scoped in content.
 */
async function markFired(tenantId: string, event: string, stepOrder: number): Promise<void> {
  await dbRun(
    `INSERT INTO admin_marketing_sends
       (id, enrollment_id, sequence_id, channel, content, status, created_at)
     VALUES (?, 'aftersales-marker', ?, 'in_app', ?, 'sent', ?)`,
    crypto.randomUUID(),
    String(stepOrder),
    JSON.stringify({ event, tenant_id: tenantId, marker: true }),
    new Date().toISOString(),
  );
}

// ---------------------------------------------------------------------------
// 3. Human task routing (detractor / at-risk / no-activation)
// ---------------------------------------------------------------------------

/**
 * Routes a high-touch case to a human: an in-app notification to the tenant's
 * own team is wrong here (the audience is OUR founder/Hermes), so this notifies
 * the founder on the growth Telegram chat AND drops an in-app row on the company
 * sentinel tenant for the daily digest. Best-effort.
 */
export async function routeAftersalesToHuman(
  tenantId: string,
  reason: "detractor" | "at_risk" | "no_activation",
  detail: string,
): Promise<void> {
  const summary = `[after-sales human task] tenant ${tenantId}: ${reason} — ${detail}`;
  const chatId = GROWTH_TELEGRAM_CHAT_ID;
  if (chatId) {
    try {
      await sendTelegramMessage(
        chatId,
        `⚠️ *After-sales: ${escapeTelegramMarkdown(reason)}*\n\n${escapeTelegramMarkdown(`tenant ${tenantId}`)}\n${escapeTelegramMarkdown(detail)}\n\n_Reach out personally within 2h._`,
      );
    } catch {
      // Best-effort; the in-app row below still surfaces it in the digest.
    }
  }
  try {
    await notify({
      tenantId,
      type: `aftersales_human_${reason}`,
      title: `After-sales follow-up needed (${reason})`,
      body: detail,
      metadata: { summary, reason },
    });
  } catch {
    // Best-effort.
  }
}

// ---------------------------------------------------------------------------
// 4. advanceAftersales — behaviour-trigger tick
// ---------------------------------------------------------------------------

interface ActiveTenant {
  tenant_id: string;
  sub_created_at: string;
  sub_status: string;
  trial_ends_at: string | null;
}

/** Active/trialing tenants with a subscription, the cohort the tick scans. */
async function activeTenants(): Promise<ActiveTenant[]> {
  return (await dbAll(
    `SELECT s.tenant_id AS tenant_id, s.created_at AS sub_created_at,
            s.status AS sub_status, s.trial_ends_at AS trial_ends_at
       FROM subscriptions s
      WHERE s.status IN ('active', 'trialing')`,
  )) as ActiveTenant[];
}

/** Lifetime order count for a tenant (milestone source). */
async function orderCount(tenantId: string): Promise<number> {
  const row = (await dbGet(
    `SELECT COUNT(*)::int AS n FROM orders WHERE tenant_id = ?`,
    tenantId,
  )) as { n: number } | undefined;
  return row?.n ?? 0;
}

/** Peak single-day order volume in the recent window (ascension source). */
async function peakDailyOrders(tenantId: string, sinceDays: number): Promise<number> {
  const since = new Date(Date.now() - sinceDays * MS_PER_DAY).toISOString();
  const row = (await dbGet(
    `SELECT COALESCE(MAX(c), 0)::int AS peak FROM (
        SELECT COUNT(*)::int AS c
          FROM orders
         WHERE tenant_id = ? AND created_at >= ?
         GROUP BY substr(created_at, 1, 10)
      ) AS daily`,
    tenantId,
    since,
  )) as { peak: number } | undefined;
  return row?.peak ?? 0;
}

/**
 * Idempotency guard for a one-off touch: returns true when a tenant-scoped marker
 * for this (campaignKey, stepName) already exists. Markers are stamped by
 * sendApprovedStep() on a real delivery (and by markHumanFired() for human
 * tasks), so a one-off touch fires at most once per tenant. A GATED touch
 * (approval queued, not yet sent) leaves NO marker, so the next tick re-attempts
 * the send once the template is approved — exactly the desired behaviour.
 */
async function alreadyFired(tenantId: string, campaignKey: string, stepName: string): Promise<boolean> {
  const event = `${campaignKey}:${stepName}`;
  const row = (await dbGet(
    `SELECT 1 AS hit
       FROM admin_marketing_sends
      WHERE content->>'event' = ? AND content->>'tenant_id' = ?
      LIMIT 1`,
    event,
    tenantId,
  )) as { hit: number } | undefined;
  return Boolean(row);
}

/**
 * The daily behaviour tick. For each active tenant, evaluate the trigger set and
 * fire (or gate, or human-route) the matching touches. Per-run capped, guarded by
 * alreadyFired() so each one-off touch fires at most once. Quiet-hours/consent/
 * caps are enforced downstream in sendOwnerMessage. Returns the number of touches
 * delivered/queued this run.
 */
export async function advanceAftersales(limit: number = AFTERSALES_SEND_PER_RUN_CAP): Promise<number> {
  // Skip entirely if the onboarding campaign isn't seeded (nothing to send).
  if (!(await getCampaignId(ONBOARDING_CAMPAIGN_KEY))) return 0;

  const tenants = await activeTenants();
  const now = Date.now();
  let fired = 0;

  for (const t of tenants) {
    if (fired >= limit) break;

    const subAgeDays = Math.floor((now - new Date(t.sub_created_at).getTime()) / MS_PER_DAY);

    // --- Milestone: first 100 orders ---
    const orders = await orderCount(t.tenant_id);
    if (orders >= FIRST_100_ORDERS) {
      fired += await maybeFire(t.tenant_id, "aftersales-milestones", "first-100-orders");
      if (fired >= limit) break;
    }

    // --- Milestone: 30-day snapshot ---
    if (subAgeDays >= SNAPSHOT_DAY) {
      fired += await maybeFire(t.tenant_id, "aftersales-milestones", "30-day-snapshot");
      if (fired >= limit) break;
    }

    // --- Anniversary (1mo / 6mo / 1yr) ---
    for (const day of ANNIVERSARY_DAYS) {
      if (subAgeDays >= day) {
        const stepName =
          day === 30 ? "anniversary-1mo" : day === 182 ? "anniversary-6mo" : "anniversary-1yr";
        fired += await maybeFire(t.tenant_id, "aftersales-anniversary", stepName);
        if (fired >= limit) break;
      }
    }
    if (fired >= limit) break;

    // --- Trial ending (day 4/5) ---
    if (t.sub_status === "trialing" && TRIAL_ENDING_DAYS.includes(subAgeDays)) {
      // Trial-ending uses the onboarding setup-nudge copy (convert intent).
      fired += await maybeFire(t.tenant_id, "aftersales-onboarding", "setup-nudge");
      if (fired >= limit) break;
    }

    // --- Ascension: Starter -> Pro on >80 orders/day ---
    const peak = await peakDailyOrders(t.tenant_id, USAGE_DIP_LOOKBACK_DAYS);
    if (peak >= ASCENSION_ORDERS_PER_DAY) {
      fired += await maybeFire(t.tenant_id, "aftersales-ascension", "starter-to-pro");
      if (fired >= limit) break;
    }

    // --- No-activation: trial tenant past day 1 with zero orders -> human ---
    if (t.sub_status === "trialing" && subAgeDays >= 1 && orders === 0) {
      if (!(await alreadyFired(t.tenant_id, "aftersales-human", "no_activation"))) {
        await routeAftersalesToHuman(t.tenant_id, "no_activation", "trial tenant has no orders past day 1");
        await markHumanFired(t.tenant_id, "no_activation");
        fired += 1;
      }
    }
  }

  return fired;
}

/**
 * Evaluates one one-off touch. Returns 1 when it newly fired (delivered/pending,
 * marker stamped) OR newly gated (approval queued); 0 when it was already fired
 * or the step is unknown. A gated touch counts toward the per-run cap so a tick
 * that only queues approvals still respects the bound, and re-attempts next tick.
 */
async function maybeFire(tenantId: string, campaignKey: string, stepName: string): Promise<number> {
  if (await alreadyFired(tenantId, campaignKey, stepName)) return 0;
  const campaign = getAftersalesCampaign(campaignKey);
  const step = campaign?.steps.find((s) => s.name === stepName);
  if (!step) return 0;
  await sendApprovedStep(tenantId, campaignKey, step);
  return 1;
}

/** Records a human-task marker so it isn't re-routed every tick. */
async function markHumanFired(tenantId: string, reason: string): Promise<void> {
  await markFired(tenantId, `aftersales-human:${reason}`, 0);
}

/** Registers the M4 template-approval execution handler. Called at boot. */
export function registerAftersalesJobs(): void {
  registerJobHandler(APPROVE_AFTERSALES_TEMPLATE_JOB, runApproveAftersalesTemplate);
}
