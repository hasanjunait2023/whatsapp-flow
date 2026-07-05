-- 0013_contact_thread_state_archived_idx.sql
-- get_inbox_contacts queries: WHERE tenant_id = ? AND is_archived = ? ORDER BY last_message_at DESC
-- Existing index is (tenant_id, last_message_at). Postgres scans all tenant rows then heap-filters
-- is_archived. For tenants with many archived contacts this wastes index range reads.
-- A (tenant_id, is_archived, last_message_at) index lets Postgres seek directly to the archived
-- partition and scan in sort order — no heap filter, O(page_size) reads regardless of archive ratio.

CREATE INDEX IF NOT EXISTS "contact_thread_state_tenant_archived_msg_at_idx"
    ON "contact_thread_state" ("tenant_id", "is_archived", "last_message_at" DESC);
