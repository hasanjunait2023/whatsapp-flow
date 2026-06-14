import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runMigrations } from "../src/db/migrate.js";
import { dbGet, dbRun } from "../src/db/raw.js";

/**
 * Seeds the 30-day content calendar (docs/growth/content/calendar.json) into
 * social_posts as ai_generated drafts (status='draft'). The content-autopilot
 * daily tick later routes each due draft through the M1 approval gate; nothing
 * publishes from this script.
 *
 * IDEMPOTENCY / dedupe key: (planned_for, title) among ai_generated drafts.
 * Each calendar day maps to a unique planned_for (launch date + day-1) and a
 * unique hook (-> title), so this pair is a stable natural key. Re-running skips
 * any row whose (planned_for, title) already exists, so the script is safe to
 * run repeatedly. No schema change needed — we reuse existing columns.
 *
 * Launch date: GROWTH_LAUNCH_DATE (YYYY-MM-DD) or today (UTC). day 1 lands on
 * the launch date, day N on launch + (N-1) days.
 *
 * Run post-deploy from apps/server:
 *   GROWTH_LAUNCH_DATE=2026-07-01 npx tsx scripts/seed-growth-content.ts
 *   (omit GROWTH_LAUNCH_DATE to start from today)
 */

const TITLE_MAX = 200;

interface CalendarEntry {
  day: number;
  pillar: string;
  platform: string[];
  format: string;
  hook: string;
  caption: string;
  cta: string;
  media_direction: string;
}

/** A post may list several platforms; store the lowercased primary (first). */
function normalizePlatform(platforms: string[]): string {
  const primary = platforms[0] ?? "facebook";
  return primary.trim().toLowerCase();
}

/** caption + cta, with the art-direction folded in as a [media: ...] note. */
function buildBody(entry: CalendarEntry): string {
  const parts = [entry.caption.trim(), entry.cta.trim()];
  if (entry.media_direction.trim()) {
    parts.push(`[media: ${entry.media_direction.trim()}]`);
  }
  return parts.join("\n\n");
}

/** Launch date + (day-1) days as a YYYY-MM-DD string. */
function plannedFor(launchDate: string, day: number): string {
  const base = new Date(`${launchDate}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + (day - 1));
  return base.toISOString().slice(0, 10);
}

function truncateTitle(hook: string): string {
  const trimmed = hook.trim();
  return trimmed.length > TITLE_MAX ? trimmed.slice(0, TITLE_MAX) : trimmed;
}

function resolveLaunchDate(): string {
  const raw = process.env.GROWTH_LAUNCH_DATE;
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (raw) {
    throw new Error(`GROWTH_LAUNCH_DATE must be YYYY-MM-DD, got "${raw}"`);
  }
  return new Date().toISOString().slice(0, 10);
}

async function loadCalendar(): Promise<CalendarEntry[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = resolve(here, "../../../docs/growth/content/calendar.json");
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("calendar.json must be a JSON array");
  }
  return parsed as CalendarEntry[];
}

async function main(): Promise<void> {
  await runMigrations();

  const launchDate = resolveLaunchDate();
  const calendar = await loadCalendar();

  let inserted = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const entry of calendar) {
    const title = truncateTitle(entry.hook);
    const planned = plannedFor(launchDate, entry.day);

    // Dedupe on the natural key (planned_for, title) among ai_generated rows.
    const existing = await dbGet(
      `SELECT id FROM social_posts
        WHERE ai_generated = true AND planned_for = ? AND title = ?
        LIMIT 1`,
      planned,
      title,
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    await dbRun(
      `INSERT INTO social_posts
         (id, platform, channel_ids, title, body, media_urls, status,
          planned_for, ai_generated, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, true, ?, ?)`,
      crypto.randomUUID(),
      normalizePlatform(entry.platform),
      JSON.stringify([]),
      title,
      buildBody(entry),
      JSON.stringify([]),
      planned,
      now,
      now,
    );
    inserted += 1;
  }

  process.stdout.write(
    `Seeded growth content calendar (launch ${launchDate}):\n` +
      `  inserted: ${inserted}\n` +
      `  skipped (already present): ${skipped}\n` +
      `  total in calendar: ${calendar.length}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`Seed failed: ${err?.message ?? err}\n`);
    process.exit(1);
  });
