import { runMigrations } from "../src/db/migrate.js";
import { dbGet, dbRun } from "../src/db/raw.js";
import {
  AFTERSALES_CAMPAIGNS,
  AFTERSALES_CAMPAIGN_TYPE,
  type AftersalesCampaign,
  type AftersalesStep,
} from "../src/services/growth/aftersales-campaigns.js";

/**
 * Seeds the M4 AFTER-SALES + LOYALTY lifecycle campaigns: one
 * admin_marketing_campaigns row per campaign key + its admin_marketing_sequences
 * steps, with bilingual templates from STRATEGY.md §5 + the M4 touch map. The
 * aftersales.ts enroll/advance logic looks campaigns up by name (the key), so the
 * identities are stable across re-runs.
 *
 * IDEMPOTENCY: dedupe on (name, type='aftersales') for campaigns and on
 * (campaign_id, step_order) for steps. Re-running upserts copy and re-seeds any
 * missing step WITHOUT touching the `approved` flag, so a re-seed never silently
 * un-gates a template the founder already approved. Safe to run repeatedly.
 *
 * Nothing sends here — this only provisions the campaigns. Each step's template
 * is then approved ONCE by the founder through the gate (template-approve-once)
 * before any auto-send to a consented owner.
 *
 * Run post-deploy from apps/server (do NOT run against prod casually):
 *   npx tsx scripts/seed-aftersales-campaigns.ts
 */

const STATUS_ACTIVE = "active";

async function upsertCampaign(campaign: AftersalesCampaign): Promise<string> {
  const now = new Date().toISOString();
  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_campaigns WHERE name = ? AND type = ? LIMIT 1`,
    campaign.key,
    AFTERSALES_CAMPAIGN_TYPE,
  )) as { id: string } | undefined;

  if (existing) {
    await dbRun(
      `UPDATE admin_marketing_campaigns
          SET name_bn = ?, status = ?, use_whatsapp = true, use_email = true, updated_at = ?
        WHERE id = ?`,
      campaign.nameBn,
      STATUS_ACTIVE,
      now,
      existing.id,
    );
    return existing.id;
  }

  const id = crypto.randomUUID();
  await dbRun(
    `INSERT INTO admin_marketing_campaigns
       (id, name, name_bn, type, status, use_whatsapp, use_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, true, true, ?, ?)`,
    id,
    campaign.key,
    campaign.nameBn,
    AFTERSALES_CAMPAIGN_TYPE,
    STATUS_ACTIVE,
    now,
    now,
  );
  return id;
}

/** Upserts one sequence step. Returns true when newly inserted. */
async function ensureSequenceStep(campaignId: string, step: AftersalesStep): Promise<boolean> {
  const existing = (await dbGet(
    `SELECT id FROM admin_marketing_sequences WHERE campaign_id = ? AND step_order = ? LIMIT 1`,
    campaignId,
    step.stepOrder,
  )) as { id: string } | undefined;

  const contentTemplate = JSON.stringify({
    title: step.title,
    body_en: step.bodyEn,
    body_bn: step.bodyBn,
    channels: step.channels,
    channel_mode: step.channelMode,
  });
  // Channel column is single-valued in the schema; store the primary (first)
  // channel here. The full channel list lives in content_template.channels.
  const primaryChannel = step.channels[0];

  if (existing) {
    // NOTE: deliberately does NOT reset `approved` — a re-seed must not un-gate a
    // template the founder already approved. Editing copy that needs re-approval
    // is an explicit operation, not a side effect of re-seeding.
    await dbRun(
      `UPDATE admin_marketing_sequences
          SET name = ?, name_bn = ?, channel = ?, theme = ?, content_template = ?, is_active = true
        WHERE id = ?`,
      step.name,
      step.nameBn,
      primaryChannel,
      "aftersales",
      contentTemplate,
      existing.id,
    );
    return false;
  }

  await dbRun(
    `INSERT INTO admin_marketing_sequences
       (id, campaign_id, week_number, step_order, name, name_bn, channel, theme,
        content_template, is_active, approved, created_at)
     VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, true, false, ?)`,
    crypto.randomUUID(),
    campaignId,
    step.stepOrder,
    step.name,
    step.nameBn,
    primaryChannel,
    "aftersales",
    contentTemplate,
    new Date().toISOString(),
  );
  return true;
}

async function main(): Promise<void> {
  await runMigrations();

  let campaignsTouched = 0;
  let stepsInserted = 0;
  let stepsTotal = 0;

  for (const campaign of AFTERSALES_CAMPAIGNS) {
    const campaignId = await upsertCampaign(campaign);
    campaignsTouched += 1;
    for (const step of campaign.steps) {
      stepsTotal += 1;
      if (await ensureSequenceStep(campaignId, step)) stepsInserted += 1;
    }
  }

  process.stdout.write(
    `Seeded M4 after-sales campaigns:\n` +
      `  campaigns: ${campaignsTouched}\n` +
      `  steps inserted: ${stepsInserted}\n` +
      `  steps total: ${stepsTotal}\n` +
      `  (templates start UNAPPROVED — founder approves each once via the gate)\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err?.message ?? err}\n`);
    process.exit(1);
  });
