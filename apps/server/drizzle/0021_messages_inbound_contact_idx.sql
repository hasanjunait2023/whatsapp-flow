-- Partial index for Hermes isReactive() and per-contact inbound message queries.
-- The WHERE direction = 'inbound' filter halves the index size and makes the scan
-- index-only for the common case (checking if a contact has replied recently).
CREATE INDEX IF NOT EXISTS "messages_contact_id_inbound_created_idx"
    ON "messages" ("contact_id", "created_at")
    WHERE direction = 'inbound';
