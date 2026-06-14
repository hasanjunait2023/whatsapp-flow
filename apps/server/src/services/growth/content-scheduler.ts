import { dbAll, dbRun, coerceJson } from "../../db/raw.js";
import { queueApproval } from "./approvals.js";
import { PUBLISH_SOCIAL_POST_JOB } from "./social.js";

/**
 * Content autopilot (M2). A daily tick drafts the social posts whose planned_for
 * date has arrived and routes each through the M1 approval gate. It NEVER
 * publishes: it only moves draft -> awaiting_approval + queues an approval card.
 * Publishing still requires the founder to tap Approve, which enqueues
 * publish_social_post (the M1 execution path).
 *
 * IDEMPOTENCY: the transition is a guarded `UPDATE ... WHERE status = 'draft'`
 * with a rowcount check (mirrors approvals.ts). A concurrent/retried tick that
 * loses the race sees changes !== 1 and skips queuing — so a post is never
 * double-queued. A per-run cap bounds how many approvals land on the founder in
 * one tick so a backlog of due drafts can't flood the Telegram chat.
 */

/** Max drafts queued for approval per tick — keeps the founder's chat sane. */
export const DRAFT_DUE_PER_RUN_CAP = 3;

interface DraftRow {
  id: string;
  title: string | null;
  platform: string;
  body: string;
  channel_ids: unknown;
  media_urls: unknown;
}

/**
 * Finds draft social_posts due today (planned_for <= today, date compare),
 * oldest first, and routes up to DRAFT_DUE_PER_RUN_CAP of them through the
 * approval gate. Returns the count actually queued.
 */
export async function draftDueSocialPosts(
  limit: number = DRAFT_DUE_PER_RUN_CAP,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);

  // Date compare on the YYYY-MM-DD prefix so a planned_for of "2026-06-14" (or
  // a full ISO timestamp) counts as due once that calendar day arrives.
  const rows = (await dbAll(
    `SELECT id, title, platform, body, channel_ids, media_urls
       FROM social_posts
      WHERE status = 'draft'
        AND planned_for IS NOT NULL
        AND substr(planned_for, 1, 10) <= ?
      ORDER BY planned_for ASC, created_at ASC
      LIMIT ?`,
    today,
    limit,
  )) as DraftRow[];

  let queued = 0;
  for (const row of rows) {
    // Guard FIRST: claim this draft by flipping it out of 'draft'. If another
    // tick already claimed it (changes !== 1) we skip — no double-queue.
    const claim = await dbRun(
      `UPDATE social_posts SET status = 'awaiting_approval', updated_at = ?
        WHERE id = ? AND status = 'draft'`,
      new Date().toISOString(),
      row.id,
    );
    if (claim.changes !== 1) continue;

    const channelIds = coerceJson<string[]>(row.channel_ids ?? []) ?? [];
    const mediaUrls = coerceJson<string[]>(row.media_urls ?? []) ?? [];
    // social_posts has no pillar column; the hook lives in `title` (the seed
    // stores it there). Summary uses the hook, falling back to the first body
    // line when title is absent.
    const hook = row.title?.trim() || firstLine(row.body);
    const summary = `[${row.platform}] ${truncate(hook)}`;

    try {
      const approvalId = await queueApproval({
        artifactType: "social_post",
        artifactId: row.id,
        summary,
        payload: {
          socialPostId: row.id,
          channelIds,
          content: row.body,
          mediaUrls,
          type: "now",
        },
        executeJobKind: PUBLISH_SOCIAL_POST_JOB,
      });

      await dbRun(
        `UPDATE social_posts SET approval_id = ?, updated_at = ? WHERE id = ?`,
        approvalId,
        new Date().toISOString(),
        row.id,
      );
      queued += 1;
    } catch (err) {
      // queueApproval persists its row before the card send, so a throw here is
      // unusual (DB error). Roll the post back to 'draft' so the next tick
      // retries instead of stranding it in awaiting_approval with no approval.
      await dbRun(
        `UPDATE social_posts SET status = 'draft', updated_at = ? WHERE id = ?`,
        new Date().toISOString(),
        row.id,
      );
      throw err;
    }
  }

  return queued;
}

/** First non-empty line of the post body, for a one-line approval summary. */
function firstLine(body: string): string {
  return body.split("\n").find((l) => l.trim().length > 0)?.trim() ?? "";
}

/** Caps a summary fragment so the approval card stays a single short line. */
function truncate(text: string): string {
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}
