import { queueApproval } from "../services/growth/approvals.js";
import { PUBLISH_SOCIAL_POST_JOB } from "../services/growth/social.js";
import { dbRun } from "../db/raw.js";
import type { FnContext, FnResult } from "./waha/session.js";

/**
 * Growth-system fn handlers, spread into the /api/fn registry.
 *
 * `growth-test-approval` is an admin-only e2e hook: it creates a dummy
 * social_post + a growth_approval and sends the Telegram approval card, so the
 * founder can exercise the full Approve/Reject -> publish round-trip by hand.
 */

type FnHandler = (body: Record<string, unknown>, ctx: FnContext) => Promise<FnResult>;

function fail(message: string, code?: string): FnResult {
  return { data: null, error: code ? { message, code } : { message } };
}

export const GROWTH_HANDLERS: Record<string, FnHandler> = {
  "growth-test-approval": async (_body, ctx) => {
    if (!ctx.isAdmin) return fail("Admin only", "FORBIDDEN");

    // A harmless draft social post (Postiz call only fires on Approve, and only
    // if POSTIZ_API_KEY is configured — otherwise the execute job records a
    // clean failure on the approval row).
    const socialPostId = crypto.randomUUID();
    const now = new Date().toISOString();
    await dbRun(
      `INSERT INTO social_posts
         (id, platform, channel_ids, body, status, ai_generated, created_at, updated_at)
       VALUES (?, 'test', ?, ?, 'awaiting_approval', true, ?, ?)`,
      socialPostId,
      JSON.stringify([]),
      "Test post from growth-test-approval — approve to exercise the publish path.",
      now,
      now,
    );

    const approvalId = await queueApproval({
      artifactType: "social_post",
      artifactId: socialPostId,
      summary: "Test social post (growth-test-approval)",
      payload: {
        socialPostId,
        postiz: {
          type: "draft",
          date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          posts: [],
        },
      },
      executeJobKind: PUBLISH_SOCIAL_POST_JOB,
    });

    return {
      data: { approval_id: approvalId, social_post_id: socialPostId },
      error: null,
    };
  },
};
