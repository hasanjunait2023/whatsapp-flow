-- Composite index for CEO scheduler tick (every 60 s):
--   WHERE enabled = true AND agent = 'ceo' AND hour_utc <= ?
-- Without this, checkCeoSchedules() full seq-scans agent_schedules every minute.
CREATE INDEX IF NOT EXISTS "agent_schedules_enabled_agent_hour_idx"
    ON "agent_schedules" ("enabled", "agent", "hour_utc");

-- Composite index for approval-expiry sweep (hourly):
--   WHERE status = 'awaiting_approval' AND expires_at IS NOT NULL AND expires_at <= ?
-- Existing single-column status index forces a heap-fetch + recheck on expires_at.
CREATE INDEX IF NOT EXISTS "growth_approvals_status_expires_idx"
    ON "growth_approvals" ("status", "expires_at");

-- Partial indexes for daily media cleanup:
--   WHERE content_type IN (...) AND sent_at < ? AND media_url IS NOT NULL  LIMIT ?
-- Full seq-scans were the only option without these.
CREATE INDEX IF NOT EXISTS "messages_sent_at_has_media_idx"
    ON "messages" ("sent_at") WHERE media_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS "fb_messages_sent_at_has_media_idx"
    ON "fb_messages" ("sent_at") WHERE media_url IS NOT NULL;

-- Partial index for daily notification cleanup:
--   WHERE is_read = true AND created_at < ?
CREATE INDEX IF NOT EXISTS "notifications_read_created_at_idx"
    ON "in_app_notifications" ("created_at") WHERE is_read = true;
