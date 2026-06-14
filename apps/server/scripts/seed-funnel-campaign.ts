import { runMigrations } from "../src/db/migrate.js";
import { dbGet, dbRun } from "../src/db/raw.js";
import {
  FUNNEL_CAMPAIGN_NAME,
  FUNNEL_CAMPAIGN_NAME_BN,
  FUNNEL_CAMPAIGN_TYPE,
  FUNNEL_FREQUENCY_PER_WEEK,
  FUNNEL_FREQUENCY_PER_MONTH,
  FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
  FUNNEL_STEPS,
} from "../src/services/growth/funnel-campaign.js";

/**
 * Seeds the value-first onboarding funnel (M3 LEAD-GEN): ONE
 * admin_marketing_campaigns row + its admin_marketing_sequences steps (Day0
 * deliver lead magnet / Day1 value drop / Day3 demo / Day5 trial nudge), with
 * bilingual templates from docs/growth/content/CONTENT-M2.md. The funnel.ts
 * auto-enroll + draft tick look the campaign up by name, so the identity is
 * stable across re-runs.
 *
 * IDEMPOTENCY: dedupe on the campaign name (a stable natural key). Re-running
 * upserts the campaign config and ensures each sequence step exists exactly once
 * (dedupe on (campaign_id, step_order)). Safe to run repeatedly. Nothing sends —
 * this only provisions the campaign; messages are drafted + founder-approved.
 *
 * Run post-deploy from apps/server (do NOT run against prod casually):
 *   npx tsx scripts/seed-funnel-campaign.ts
 */

const STATUS_ACTIVE = "active";

async function upsertCampaign(): Promise<string> {
  const now = new Date().toISOString();
  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_campaigns WHERE name = ? AND type = ? LIMIT 1`,
    FUNNEL_CAMPAIGN_NAME,
    FUNNEL_CAMPAIGN_TYPE,
  )) as { id: string } | undefined;

  if (existing) {
    await dbRun(
      `UPDATE admin_marketing_campaigns
          SET name_bn = ?, status = ?, frequency_per_week = ?, frequency_per_month = ?,
              min_days_between_messages = ?, use_whatsapp = true, use_email = true,
              updated_at = ?
        WHERE id = ?`,
      FUNNEL_CAMPAIGN_NAME_BN,
      STATUS_ACTIVE,
      FUNNEL_FREQUENCY_PER_WEEK,
      FUNNEL_FREQUENCY_PER_MONTH,
      FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
      now,
      existing.id,
    );
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO admin_marketing_campaigns
       (id, name, name_bn, type, status, frequency_per_week, frequency_per_month,
        min_days_between_messages, use_whatsapp, use_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, true, true, ?, ?)`,
    id,
    FUNNEL_CAMPAIGN_NAME,
    FUNNEL_CAMPAIGN_NAME_BN,
    FUNNEL_CAMPAIGN_TYPE,
    STATUS_ACTIVE,
    FUNNEL_FREQUENCY_PER_WEEK,
    FUNNEL_FREQUENCY_PER_MONTH,
    FUNNEL_MIN_DAYS_BETWEEN_MESSAGES,
    now,
    now,
  );
  return id;
}

async function ensureSequenceStep(campaignId: string, step: (typeof FUNNEL_STEPS)[number]): Promise<boolean> {
  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_sequences WHERE campaign_id = ? AND step_order = ? LIMIT 1`,
    campaignId,
    step.stepOrder,
  )) as { id: string } | undefined;

  const contentTemplate = JSON.stringify({
    subject: step.subject,
    subject_bn: step.subjectBn,
    body: step.body,
    body_bn: step.bodyBn,
    day_offset: step.dayOffset,
  });

  if (existing) {
    await dbRun(
      `UPDATE admin_marketing_sequences
          SET name = ?, name_bn = ?, channel = ?, theme = ?, content_template = ?, is_active = true
        WHERE id = ?`,
      step.name,
      step.nameBn,
      step.channel,
      step.theme,
      contentTemplate,
      existing.id,
    );
    return false;
  }

  await dbRun(
    `INSERT INTO admin_marketing_sequences
       (id, campaign_id, week_number, step_order, name, name_bn, channel, theme,
        content_template, is_active, created_at)
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, true, ?)`,
    crypto.randomUUID(),
    campaignId,
    step.stepOrder,
    step.name,
    step.nameBn,
    step.channel,
    step.theme,
    contentTemplate,
    new Date().toISOString(),
  );
  return true;
}

async function main(): Promise<void> {
  await runMigrations();

  const campaignId = await upsertCampaign();

  let inserted = 0;
  for (const step of FUNNEL_STEPS) {
    const wasNew = await ensureSequenceStep(campaignId, step);
    if (wasNew) inserted += 1;
  }

  process.stdout.write(
    `Seeded funnel campaign "${FUNNEL_CAMPAIGN_NAME}":\n` +
      `  campaign id: ${campaignId}\n` +
      `  steps inserted: ${inserted}\n` +
      `  steps total: ${FUNNEL_STEPS.length}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err?.message ?? err}\n`);
    process.exit(1);
  });
