-- 0011_contacts_phone_idx.sql
-- Missing composite index for the hot ingest lookup path.
--
-- ingest.ts calls findContact(tx, instance_id, "phone_number", phone) on
-- every inbound AND outbound message. The query is:
--   SELECT id FROM contacts WHERE instance_id = ? AND phone_number = ?
--
-- The existing contacts_instance_id_wa_id_idx covers (instance_id, wa_id),
-- NOT phone_number — so Postgres falls back to a partial index scan on
-- instance_id then filters phone_number in memory.
--
-- At 100k messages/minute this is 100k sequential scans per minute across
-- all contacts rows for the given instance. A composite index on
-- (instance_id, phone_number) makes each lookup O(log n).

CREATE INDEX IF NOT EXISTS "contacts_instance_id_phone_number_idx"
    ON "contacts" ("instance_id", "phone_number");
