-- 0020_missing_composite_indexes.sql
-- Two missing indexes found during scaling audit.
--
-- (1) contacts(instance_id, phone_number): findContact() in waha/ingest.ts
--     queries WHERE instance_id = ? AND phone_number = ? on every inbound message
--     that requires LID reconciliation (~50% of messages). Without this index,
--     Postgres heap-scans all contacts for the instance after the single-column
--     instance_id lookup — O(contacts_per_instance) per message.
--
-- (2) orders(tenant_id, contact_id): followup job queries
--     SELECT DISTINCT contact_id FROM orders WHERE tenant_id = ? AND contact_id IN (...)
--     on every cron tick. The separate single-column indexes require a bitmap-AND merge;
--     a composite resolves the query with a single range scan scoped to the tenant.

CREATE INDEX IF NOT EXISTS "contacts_instance_id_phone_number_idx"
    ON "contacts" ("instance_id", "phone_number");

CREATE INDEX IF NOT EXISTS "orders_tenant_id_contact_id_idx"
    ON "orders" ("tenant_id", "contact_id");
