import { dbGet, dbRun } from "../../db/raw.js";
import { registerJobHandler } from "../../jobs/queue.js";
import {
  claimApprovalForExecution,
  markApprovalExecuted,
} from "./approvals.js";
import { postizClient, type PostizCreatePostRequest } from "../postiz/client.js";

/**
 * Execution job for an approved social post. The approval gate enqueues this
 * job (kind PUBLISH_SOCIAL_POST_JOB) only after the founder taps Approve.
 *
 * IDEMPOTENCY: claimApprovalForExecution() guards approved -> executing so a
 * queue retry that re-runs the handler returns early. As a second guard, if the
 * linked social_posts row already has a postiz_post_id the Postiz call is
 * short-circuited — so a retry after a partial success never double-publishes.
 */

export const PUBLISH_SOCIAL_POST_JOB = "publish_social_post";

interface PublishPayload {
  approvalId: string;
}

interface SocialPostPayload {
  socialPostId?: string;
  postiz: PostizCreatePostRequest;
}

async function runPublishSocialPost(payload: unknown): Promise<void> {
  const { approvalId } = payload as PublishPayload;

  const approval = await claimApprovalForExecution(approvalId);
  if (!approval) return; // not approved, or already claimed by another attempt

  const data = approval.payload as SocialPostPayload;
  const socialPostId = data.socialPostId;

  try {
    // Short-circuit guard: if we already published this post, don't re-create.
    if (socialPostId) {
      const existing = (await dbGet(
        `SELECT postiz_post_id FROM social_posts WHERE id = ?`,
        socialPostId,
      )) as { postiz_post_id: string | null } | undefined;
      if (existing?.postiz_post_id) {
        await markApprovalExecuted(approvalId, true);
        return;
      }
    }

    const result = await postizClient.createPost(data.postiz);
    const postizPostId = result.id ?? result.postId ?? null;
    // Map social_posts.status from the Postiz request type:
    //   'now' -> published, 'schedule' -> scheduled, 'draft' -> draft.
    const status =
      data.postiz.type === "now"
        ? "published"
        : data.postiz.type === "schedule"
          ? "scheduled"
          : "draft";
    const now = new Date().toISOString();

    if (socialPostId) {
      await dbRun(
        `UPDATE social_posts
           SET status = ?, postiz_post_id = ?, published_at = ?, updated_at = ?
         WHERE id = ?`,
        status,
        postizPostId,
        status === "published" ? now : null,
        now,
        socialPostId,
      );
    }

    await markApprovalExecuted(approvalId, true);
  } catch (err) {
    const message = err instanceof Error ? err.message : "publish failed";
    if (socialPostId) {
      await dbRun(
        `UPDATE social_posts SET status = 'failed', updated_at = ? WHERE id = ?`,
        new Date().toISOString(),
        socialPostId,
      );
    }
    await markApprovalExecuted(approvalId, false, message);
    // Rethrow so the queue retries. The claim guard above makes the retry safe:
    // it will not re-run unless the row is moved back to 'approved'.
    throw err;
  }
}

export function registerGrowthSocialJobs(): void {
  registerJobHandler(PUBLISH_SOCIAL_POST_JOB, runPublishSocialPost);
}
