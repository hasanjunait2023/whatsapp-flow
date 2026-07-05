-- 0016_messages_instance_created_idx.sql
-- Covers the number-health aggregation query:
--   WHERE tenant_id = ? AND created_at >= ? AND instance_id IN (...)
--   GROUP BY instance_id
-- Previous (tenant_id, created_at) index required a heap filter for instance_id.
-- New composite covers the WHERE + GROUP BY without a heap fetch.

CREATE INDEX IF NOT EXISTS "messages_tenant_instance_created_idx"
    ON "messages" ("tenant_id", "instance_id", "created_at");
