import { eq } from "drizzle-orm";
import { db, sqlite } from "../../db/index.js";
import { agentSouls, soulSources } from "../../db/schema.js";
import { emitChange } from "../../realtime/emitter.js";
import { enqueueJob, registerJobHandler } from "../../jobs/queue.js";
import { crawlWebsite } from "./ingest-website.js";
import { ingestFacebookPage } from "./ingest-facebook.js";
import { synthesizeSoul, type SoulProfile } from "./synthesize.js";
import { buildSystemPrompt } from "./prompt-builder.js";

/**
 * Soul lifecycle orchestration:
 *   startSoulIngestion -> job "soul_ingest" -> fetch sources -> synthesize ->
 *   status "ready" -> human reviews/edits -> approveSoul -> prompt cache built.
 */

export const SOUL_INGEST_JOB = "soul_ingest";

export interface IngestRequest {
  websiteUrl?: string;
  facebookPageId?: string;
  includeFacebook?: boolean;
}

export function getSoul(tenantId: string) {
  return db.select().from(agentSouls).where(eq(agentSouls.tenant_id, tenantId)).limit(1).all()[0];
}

export function startSoulIngestion(tenantId: string, req: IngestRequest): string {
  if (!req.websiteUrl && !req.includeFacebook) {
    throw new Error("Provide a website URL and/or enable Facebook ingestion");
  }
  if (req.websiteUrl) {
    const url = new URL(req.websiteUrl); // throws on invalid
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Website URL must be http(s)");
    }
  }

  const existing = getSoul(tenantId);
  const now = new Date().toISOString();
  let soulId: string;

  if (existing) {
    soulId = existing.id;
    db.update(agentSouls)
      .set({
        status: "ingesting",
        error_message: null,
        version: existing.version + 1,
        updated_at: now,
      })
      .where(eq(agentSouls.id, soulId))
      .run();
    // Old sources are superseded by this run.
    db.delete(soulSources).where(eq(soulSources.soul_id, soulId)).run();
  } else {
    soulId = crypto.randomUUID();
    db.insert(agentSouls)
      .values({ id: soulId, tenant_id: tenantId, status: "ingesting" })
      .run();
  }

  if (req.websiteUrl) {
    db.insert(soulSources)
      .values({ tenant_id: tenantId, soul_id: soulId, type: "website", url: req.websiteUrl })
      .run();
  }
  if (req.includeFacebook) {
    db.insert(soulSources)
      .values({
        tenant_id: tenantId,
        soul_id: soulId,
        type: "fb_page",
        url: req.facebookPageId ?? null,
      })
      .run();
  }

  enqueueJob({
    kind: SOUL_INGEST_JOB,
    tenantId,
    payload: { soulId },
    dedupeKey: `soul_ingest:${tenantId}`,
  });
  emitChange("agent_souls", tenantId, { id: soulId, status: "ingesting" });
  return soulId;
}

async function runSoulIngestion(payload: unknown): Promise<void> {
  const { soulId } = payload as { soulId: string };
  const soul = db.select().from(agentSouls).where(eq(agentSouls.id, soulId)).limit(1).all()[0];
  if (!soul) return;
  const tenantId = soul.tenant_id;

  try {
    const sources = db.select().from(soulSources).where(eq(soulSources.soul_id, soulId)).all();
    const texts: string[] = [];

    for (const source of sources) {
      try {
        let text = "";
        if (source.type === "website" && source.url) {
          const crawled = await crawlWebsite(source.url);
          text = crawled.text;
        } else if (source.type === "fb_page") {
          const fb = await ingestFacebookPage(tenantId, source.url ?? undefined);
          text = fb.text;
        } else if (source.type === "manual") {
          text = source.content_text ?? "";
        }
        db.update(soulSources)
          .set({
            status: "fetched",
            content_text: text,
            fetched_at: new Date().toISOString(),
            error: null,
          })
          .where(eq(soulSources.id, source.id))
          .run();
        if (text) texts.push(text);
      } catch (err) {
        db.update(soulSources)
          .set({ status: "error", error: err instanceof Error ? err.message : "fetch failed" })
          .where(eq(soulSources.id, source.id))
          .run();
      }
    }

    if (texts.length === 0) {
      throw new Error("All sources failed to fetch — nothing to synthesize");
    }

    const profile = await synthesizeSoul(tenantId, texts.join("\n\n---\n\n"));
    db.update(agentSouls)
      .set({
        status: "ready",
        business_profile: profile.business_profile,
        tone: profile.tone,
        products_summary: profile.products_summary,
        faqs: profile.faqs,
        hours: profile.hours,
        policies: profile.policies,
        languages: profile.languages,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(agentSouls.id, soulId))
      .run();
    emitChange("agent_souls", tenantId, { id: soulId, status: "ready" });
  } catch (err) {
    db.update(agentSouls)
      .set({
        status: "error",
        error_message: err instanceof Error ? err.message : "ingestion failed",
        updated_at: new Date().toISOString(),
      })
      .where(eq(agentSouls.id, soulId))
      .run();
    emitChange("agent_souls", tenantId, { id: soulId, status: "error" });
    throw err;
  }
}

/** Rebuilds the soul row from (possibly human-edited) fields and approves it. */
export function approveSoul(
  tenantId: string,
  edits?: Partial<Pick<SoulProfile, "faqs" | "tone" | "policies" | "products_summary" | "hours">>,
): void {
  const soul = getSoul(tenantId);
  if (!soul) throw new Error("No soul to approve");
  if (soul.status !== "ready" && soul.status !== "approved") {
    throw new Error(`Soul is not ready for approval (status: ${soul.status})`);
  }

  const merged: SoulProfile = {
    business_profile: soul.business_profile as SoulProfile["business_profile"],
    tone: (edits?.tone ?? soul.tone) as SoulProfile["tone"],
    products_summary: (edits?.products_summary ??
      soul.products_summary) as SoulProfile["products_summary"],
    faqs: (edits?.faqs ?? soul.faqs ?? []) as SoulProfile["faqs"],
    hours: (edits?.hours ?? soul.hours) as SoulProfile["hours"],
    policies: (edits?.policies ?? soul.policies) as SoulProfile["policies"],
    languages: (soul.languages ?? []) as SoulProfile["languages"],
  };

  const prompt = buildSystemPrompt(merged);
  db.update(agentSouls)
    .set({
      status: "approved",
      tone: merged.tone,
      products_summary: merged.products_summary,
      faqs: merged.faqs,
      hours: merged.hours,
      policies: merged.policies,
      system_prompt_cache: prompt,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(agentSouls.id, soul.id))
    .run();
  emitChange("agent_souls", tenantId, { id: soul.id, status: "approved" });
}

/** Returns the approved system prompt for agents, or null if not approved. */
export function getApprovedSystemPrompt(tenantId: string): string | null {
  const row = sqlite
    .prepare(
      `SELECT system_prompt_cache FROM agent_souls WHERE tenant_id = ? AND status = 'approved' LIMIT 1`,
    )
    .get(tenantId) as { system_prompt_cache: string | null } | undefined;
  return row?.system_prompt_cache ?? null;
}

export function registerSoulJobs(): void {
  registerJobHandler(SOUL_INGEST_JOB, runSoulIngestion);
}
