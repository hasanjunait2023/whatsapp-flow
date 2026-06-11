import { unlink } from "node:fs/promises";
import path from "node:path";
import { sqlite } from "../db/index.js";
import { MEDIA_DIR } from "../lib/env.js";

/**
 * Retention sweeps ported from the Supabase cron edge functions:
 *  - media-cleanup-cron: strips media past MEDIA_RETENTION_DAYS, deletes the
 *    local file, and nulls the media columns (keeps the message row).
 *  - webhook-cleanup-cron: prunes old webhook audit logs + read notifications.
 *
 * These run system-wide (no caller tenant), so they are NOT request handlers and
 * carry no tenant predicate — they are scheduled jobs, not /api/fn endpoints.
 */

const MEDIA_RETENTION_DAYS = 30;
const WEBHOOK_RETENTION_DAYS = 3;
const NOTIFICATION_RETENTION_DAYS = 30;
const MEDIA_TYPES = ["image", "video", "audio", "voice", "ptt"];
const BATCH_SIZE = 500;

function cutoffIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/** True for a locally-stored relative media path ({tenant}/whatsapp/{file}). */
function isLocalMedia(url: string | null): boolean {
  return !!url && !/^https?:\/\//i.test(url);
}

async function removeLocalFile(rel: string): Promise<boolean> {
  // rel is the stored relative path; resolve under MEDIA_DIR and refuse traversal.
  const root = path.resolve(MEDIA_DIR);
  const resolved = path.resolve(root, rel);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return false;
  try {
    await unlink(resolved);
    return true;
  } catch {
    return false;
  }
}

interface MediaRow {
  id: string;
  media_url: string | null;
}

async function cleanupMediaTable(table: "messages" | "fb_messages"): Promise<{ processed: number; filesDeleted: number }> {
  const placeholders = MEDIA_TYPES.map(() => "?").join(",");
  const rows = sqlite
    .prepare(
      `SELECT id, media_url FROM ${table}
       WHERE content_type IN (${placeholders}) AND sent_at < ? AND media_url IS NOT NULL
       LIMIT ?`,
    )
    .all(...MEDIA_TYPES, cutoffIso(MEDIA_RETENTION_DAYS), BATCH_SIZE) as MediaRow[];

  let filesDeleted = 0;
  const clear = sqlite.prepare(
    `UPDATE ${table} SET media_url = NULL, media_mime_type = NULL, media_filename = NULL WHERE id = ?`,
  );
  for (const row of rows) {
    if (isLocalMedia(row.media_url) && (await removeLocalFile(row.media_url!))) {
      filesDeleted += 1;
    }
    clear.run(row.id);
  }
  return { processed: rows.length, filesDeleted };
}

export interface MediaCleanupResult {
  messagesProcessed: number;
  filesDeleted: number;
  waMessagesCleaned: number;
  fbMessagesCleaned: number;
}

/** media-cleanup-cron: strip + delete media older than the retention window. */
export async function runMediaCleanup(): Promise<MediaCleanupResult> {
  const wa = await cleanupMediaTable("messages");
  const fb = await cleanupMediaTable("fb_messages");
  return {
    messagesProcessed: wa.processed + fb.processed,
    filesDeleted: wa.filesDeleted + fb.filesDeleted,
    waMessagesCleaned: wa.processed,
    fbMessagesCleaned: fb.processed,
  };
}

export interface WebhookCleanupResult {
  webhookEventsDeleted: number;
  notificationsDeleted: number;
}

/** webhook-cleanup-cron: prune old webhook audit logs + read in-app notifications. */
export function runWebhookCleanup(): WebhookCleanupResult {
  const webhookEventsDeleted = sqlite
    .prepare("DELETE FROM webhook_events_log WHERE created_at < ?")
    .run(cutoffIso(WEBHOOK_RETENTION_DAYS)).changes;

  const notificationsDeleted = sqlite
    .prepare("DELETE FROM in_app_notifications WHERE is_read = 1 AND created_at < ?")
    .run(cutoffIso(NOTIFICATION_RETENTION_DAYS)).changes;

  return { webhookEventsDeleted, notificationsDeleted };
}
