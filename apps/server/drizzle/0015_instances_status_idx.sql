-- 0015_instances_status_idx.sql
-- Two hot-path indexes:
--
-- 1. whatsapp_instances: fallback instance lookup on every message send
--    WHERE tenant_id = ? AND status = 'active' AND is_deleted IS NOT TRUE
--    ORDER BY is_default DESC LIMIT 1
--    Current: only (tenant_id) index → scans all tenant rows, heap-filters status/is_deleted.
--    New:     (tenant_id, status, is_deleted, is_default DESC) covers the WHERE + ORDER BY
--             entirely — no heap filter, O(1) seek regardless of instance count.
--
-- 2. contact_thread_state: unread badge count SUM
--    WHERE tenant_id = ? AND is_archived = false AND unread_count > 0
--    Current: (tenant_id, is_archived, last_message_at DESC) from 0013 — helps the WHERE
--             but still scans all non-archived contacts to heap-filter unread_count > 0.
--    New:     partial index WHERE unread_count > 0 on (tenant_id, is_archived) cuts the
--             index to only the fraction of contacts with unread messages.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "whatsapp_instances_tenant_status_idx"
    ON "whatsapp_instances" ("tenant_id", "status", "is_deleted", "is_default" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "contact_thread_state_unread_idx"
    ON "contact_thread_state" ("tenant_id", "is_archived")
    WHERE unread_count > 0;
