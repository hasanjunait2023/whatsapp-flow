import { dbGet, dbAll, dbRun } from "../../db/raw.js";
import { queueApproval, type ArtifactType } from "./approvals.js";
import { SEND_MARKETING_MESSAGE_JOB } from "./marketing-send.js";
import {
  FUNNEL_CAMPAIGN_NAME,
  FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
  FUNNEL_ENTITY_TYPE_LEAD,
  FUNNEL_STEPS,
  FUNNEL_STEP_COUNT,
  type FunnelStep,
} from "./funnel-campaign.js";

/**
 * Value-first onboarding funnel (M3 LEAD-GEN). Two halves:
 *
 *   1. enrollLeadInFunnel(): called from the public demo-lead handler. Upserts
 *      the lead's funnel enrollment (entity_type='lead'), idempotent on
 *      (campaign_id, entity_id), with next_message_at set to now so Day0 is due.
 *
 *   2. advanceFunnelEnrollments(): a conservative DRAFT tick. It finds active
 *      enrollments whose next_message_at has arrived, respects the campaign
 *      frequency caps (min_days_between_messages + weekly cap), drafts the next
 *      step through the M1 approval gate, and atomically advances the enrollment
 *      so a concurrent/retried tick can never double-queue. Nothing sends here —
 *      the founder must Approve, which enqueues SEND_MARKETING_MESSAGE_JOB.
 *
 * IDEMPOTENCY mirrors content-scheduler.ts: a guarded `UPDATE ... WHERE` with a
 * rowcount check claims each enrollment before queuing. A per-run cap bounds how
 * many approval cards land on the founder per tick.
 */

/** Max funnel steps drafted for approval per tick — keeps the founder's chat sane. */
export const FUNNEL_DRAFT_PER_RUN_CAP = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface CampaignRow {
  id: string;
  frequency_per_week: number | null;
  min_days_between_messages: number | null;
}

interface EnrollmentRow {
  id: string;
  campaign_id: string;
  entity_id: string;
  current_step: number | null;
  next_message_at: string | null;
  last_message_at: string | null;
  messages_this_week: number | null;
  week_reset_at: string | null;
}

interface LeadRow {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string | null;
}

/** Looks up the funnel campaign by its stable name. Returns null if not seeded. */
async function getFunnelCampaign(): Promise<CampaignRow | null> {
  const row = (await dbGet(
    `SELECT id, frequency_per_week, min_days_between_messages
       FROM admin_marketing_campaigns
      WHERE name = ? AND type = 'lifecycle'
      LIMIT 1`,
    FUNNEL_CAMPAIGN_NAME,
  )) as CampaignRow | undefined;
  return row ?? null;
}

/**
 * Auto-enrolls a captured lead into the value-first funnel. Idempotent: a repeat
 * submission (same lead id already enrolled in this campaign) is a no-op, so the
 * demo-lead handler can call this on every submit without creating duplicates.
 * No-ops silently when the campaign isn't seeded yet — lead capture must never
 * fail because the funnel hasn't been provisioned.
 */
export async function enrollLeadInFunnel(leadId: string): Promise<string | null> {
  const campaign = await getFunnelCampaign();
  if (!campaign) return null;

  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_enrollments
      WHERE campaign_id = ? AND entity_type = ? AND entity_id = ?
      LIMIT 1`,
    campaign.id,
    FUNNEL_ENTITY_TYPE_LEAD,
    leadId,
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
    campaign.id,
    FUNNEL_ENTITY_TYPE_LEAD,
    leadId,
    now,
    now, // next_message_at = now -> Day0 is immediately due for the next tick
    now,
    now,
  );
  return id;
}

/**
 * Draft tick. Finds active funnel enrollments due now, drafts the next step
 * through the approval gate (respecting caps), and advances each enrollment
 * atomically. Returns the number of steps actually queued for approval.
 */
export async function advanceFunnelEnrollments(
  limit: number = FUNNEL_DRAFT_PER_RUN_CAP,
): Promise<number> {
  const campaign = await getFunnelCampaign();
  if (!campaign) return 0;

  const now = new Date();
  const nowIso = now.toISOString();
  const minDays = campaign.min_days_between_messages ?? FUNNEL_MIN_DAYS_BETWEEN_MESSAGES;
  const weeklyCap = campaign.frequency_per_week ?? FUNNEL_STEP_COUNT;

  // Due = active, not yet through every step, next_message_at arrived.
  const rows = (await dbAll(
    `SELECT id, campaign_id, entity_id, current_step, next_message_at,
            last_message_at, messages_this_week, week_reset_at
       FROM admin_marketing_enrollments
      WHERE campaign_id = ?
        AND entity_type = ?
        AND status = 'active'
        AND current_step < ?
        AND next_message_at IS NOT NULL
        AND next_message_at <= ?
      ORDER BY next_message_at ASC
      LIMIT ?`,
    campaign.id,
    FUNNEL_ENTITY_TYPE_LEAD,
    FUNNEL_STEP_COUNT,
    nowIso,
    limit,
  )) as EnrollmentRow[];

  let queued = 0;
  for (const enr of rows) {
    if (!withinFrequencyCaps(enr, now, minDays, weeklyCap)) {
      // Push the due time out by the min gap so the cap is re-checked later
      // instead of this enrollment being re-scanned every tick.
      await dbRun(
        `UPDATE admin_marketing_enrollments SET next_message_at = ?
          WHERE id = ? AND next_message_at = ?`,
        new Date(now.getTime() + minDays * MS_PER_DAY).toISOString(),
        enr.id,
        enr.next_message_at,
      );
      continue;
    }

    const step = FUNNEL_STEPS[enr.current_step ?? 0];
    if (!step) continue;

    const lead = (await dbGet(
      `SELECT id, full_name, email, whatsapp_number FROM marketing_leads WHERE id = ?`,
      enr.entity_id,
    )) as LeadRow | undefined;
    if (!lead) {
      // Orphaned enrollment (lead deleted): complete it so it stops being scanned.
      await dbRun(
        `UPDATE admin_marketing_enrollments SET status = 'completed', completed_at = ?
          WHERE id = ? AND status = 'active'`,
        nowIso,
        enr.id,
      );
      continue;
    }

    // CLAIM FIRST (guarded): advance the enrollment out of its current due slot
    // before queuing. If a concurrent tick already advanced it, changes !== 1 and
    // we skip — no double-queue. next_message_at is set to the next step's due
    // time (or null when this was the final step).
    const nextStep = FUNNEL_STEPS[(enr.current_step ?? 0) + 1];
    const nextDueAt = nextStep
      ? new Date(now.getTime() + (nextStep.dayOffset - step.dayOffset) * MS_PER_DAY).toISOString()
      : null;
    const newStatus = nextStep ? "active" : "completed";

    const claim = await dbRun(
      `UPDATE admin_marketing_enrollments
          SET current_step = ?, next_message_at = ?, last_message_at = ?,
              messages_this_week = ?, week_reset_at = ?, status = ?,
              completed_at = ?, total_messages_sent = total_messages_sent + 1
        WHERE id = ? AND current_step = ? AND next_message_at = ?`,
      (enr.current_step ?? 0) + 1,
      nextDueAt,
      nowIso,
      nextWeeklyCount(enr, now),
      nextWeekResetAt(enr, now),
      newStatus,
      nextStep ? null : nowIso,
      enr.id,
      enr.current_step ?? 0,
      enr.next_message_at,
    );
    if (claim.changes !== 1) continue; // lost the race — another tick claimed it

    try {
      const approvalId = await queueApproval({
        artifactType: artifactTypeFor(step),
        artifactId: enr.id,
        summary: summaryFor(step, lead),
        payload: {
          channel: step.channel,
          enrollmentId: enr.id,
          sequenceStep: step.stepOrder,
          leadId: lead.id,
          to: step.channel === "whatsapp" ? (lead.whatsapp_number ?? "") : lead.email,
          content: contentFor(step),
        },
        executeJobKind: SEND_MARKETING_MESSAGE_JOB,
      });
      // Stash the approval id on the enrollment metadata for traceability.
      await dbRun(
        `UPDATE admin_marketing_enrollments SET metadata = ? WHERE id = ?`,
        JSON.stringify({ last_approval_id: approvalId, last_step: step.stepOrder }),
        enr.id,
      );
      queued += 1;
    } catch (err) {
      // queueApproval persists before sending its card, so a throw here is a DB
      // error. Roll the enrollment back to the claimed step so the next tick
      // retries instead of skipping the step.
      await dbRun(
        `UPDATE admin_marketing_enrollments
            SET current_step = ?, next_message_at = ?, status = 'active',
                completed_at = NULL, total_messages_sent = total_messages_sent - 1
          WHERE id = ?`,
        enr.current_step ?? 0,
        enr.next_message_at,
        enr.id,
      );
      throw err;
    }
  }

  return queued;
}

/**
 * Frequency guard. Blocks a draft when fewer than min_days have elapsed since the
 * last message, or the weekly cap (reset on a rolling 7-day window) is reached.
 */
function withinFrequencyCaps(
  enr: EnrollmentRow,
  now: Date,
  minDays: number,
  weeklyCap: number,
): boolean {
  if (enr.last_message_at) {
    const elapsedMs = now.getTime() - new Date(enr.last_message_at).getTime();
    if (elapsedMs < minDays * MS_PER_DAY) return false;
  }
  const weekCount = currentWeeklyCount(enr, now);
  if (weekCount >= weeklyCap) return false;
  return true;
}

/** Weekly counter, treating a window older than 7 days as reset to 0. */
function currentWeeklyCount(enr: EnrollmentRow, now: Date): number {
  if (!enr.week_reset_at) return enr.messages_this_week ?? 0;
  const age = now.getTime() - new Date(enr.week_reset_at).getTime();
  if (age >= 7 * MS_PER_DAY) return 0;
  return enr.messages_this_week ?? 0;
}

/** Weekly count after recording one more message in the current window. */
function nextWeeklyCount(enr: EnrollmentRow, now: Date): number {
  return currentWeeklyCount(enr, now) + 1;
}

/** Roll the weekly window forward when the prior one has aged out. */
function nextWeekResetAt(enr: EnrollmentRow, now: Date): string {
  if (!enr.week_reset_at) return now.toISOString();
  const age = now.getTime() - new Date(enr.week_reset_at).getTime();
  return age >= 7 * MS_PER_DAY ? now.toISOString() : enr.week_reset_at;
}

/** whatsapp -> outreach_batch (warm send); email -> funnel_email (stubbed). */
function artifactTypeFor(step: FunnelStep): ArtifactType {
  return step.channel === "whatsapp" ? "outreach_batch" : "funnel_email";
}

/** "[funnel <step>] <lead name>" — escaped downstream by the approval card. */
function summaryFor(step: FunnelStep, lead: LeadRow): string {
  return `[funnel ${step.name}] ${lead.full_name}`;
}

/** Bilingual content packaged for the send job (subject only used by email). */
function contentFor(step: FunnelStep): {
  subject: string;
  subjectBn: string;
  body: string;
  bodyBn: string;
} {
  return {
    subject: step.subject,
    subjectBn: step.subjectBn,
    body: step.body,
    bodyBn: step.bodyBn,
  };
}
