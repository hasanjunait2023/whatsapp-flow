-- Composite index for funnel scheduler tick:
--   WHERE campaign_id = ? AND entity_type = ? AND status = 'active' AND next_message_at <= ?
--   ORDER BY next_message_at ASC LIMIT ?
-- Without this, every scheduler minute does a full seq-scan on admin_marketing_enrollments.
CREATE INDEX IF NOT EXISTS "enrollments_campaign_type_status_next_idx"
    ON "admin_marketing_enrollments" ("campaign_id", "entity_type", "status", "next_message_at");

-- Composite index for content-scheduler tick:
--   WHERE status = 'draft' AND planned_for <= ? ORDER BY planned_for ASC LIMIT ?
-- Existing single-column status index forces a heap-fetch + in-memory sort on planned_for.
CREATE INDEX IF NOT EXISTS "social_posts_status_planned_idx"
    ON "social_posts" ("status", "planned_for");
