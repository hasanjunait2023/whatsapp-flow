import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agentSouls, soulSources } from "../db/schema.js";
import {
  startSoulIngestion,
  approveSoul,
  getSoul,
  type IngestRequest,
} from "../services/soul/index.js";
import type { FnContext, FnResult } from "./waha/session.js";

/** Agent Soul fn handlers, spread into the /api/fn registry. */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

function ok(data: unknown): FnResult {
  return { data, error: null };
}

function fail(message: string): FnResult {
  return { data: null, error: { message } };
}

export const SOUL_HANDLERS: Record<string, FnHandler> = {
  "soul-ingest": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    try {
      const soulId = startSoulIngestion(ctx.tenantId, body as IngestRequest);
      return ok({ soul_id: soulId, status: "ingesting" });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "ingestion failed to start");
    }
  },

  "soul-status": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const soul = getSoul(ctx.tenantId);
    if (!soul) return ok({ status: "none" });
    const sources = db
      .select({
        id: soulSources.id,
        type: soulSources.type,
        url: soulSources.url,
        status: soulSources.status,
        error: soulSources.error,
      })
      .from(soulSources)
      .where(eq(soulSources.soul_id, soul.id))
      .all();
    // system_prompt_cache stays server-side; the review UI edits structured fields.
    const { system_prompt_cache: _cache, ...rest } = soul;
    return ok({ ...rest, sources });
  },

  "soul-regenerate": async (_body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    const soul = getSoul(ctx.tenantId);
    if (!soul) return fail("No soul to regenerate — run soul-ingest first");
    const sources = db.select().from(soulSources).where(eq(soulSources.soul_id, soul.id)).all();
    const websiteUrl = sources.find((s) => s.type === "website")?.url ?? undefined;
    const fbSource = sources.find((s) => s.type === "fb_page");
    try {
      const soulId = startSoulIngestion(ctx.tenantId, {
        websiteUrl,
        includeFacebook: Boolean(fbSource),
        facebookPageId: fbSource?.url ?? undefined,
      });
      return ok({ soul_id: soulId, status: "ingesting" });
    } catch (err) {
      return fail(err instanceof Error ? err.message : "regeneration failed to start");
    }
  },

  "soul-approve": async (body, ctx) => {
    if (!ctx.tenantId) return fail("No active tenant");
    try {
      approveSoul(ctx.tenantId, body as Parameters<typeof approveSoul>[1]);
      const soul = db
        .select({
          id: agentSouls.id,
          status: agentSouls.status,
          approved_at: agentSouls.approved_at,
        })
        .from(agentSouls)
        .where(eq(agentSouls.tenant_id, ctx.tenantId))
        .limit(1)
        .all()[0];
      return ok(soul);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "approval failed");
    }
  },
};
