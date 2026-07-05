-- 0012_messages_sent_at_idx.sql
-- Thread view queries ORDER BY sent_at DESC LIMIT 50 (rpc.ts threadMessages).
-- Existing index is (contact_id, created_at) but ordering is on sent_at — Postgres
-- reads all rows for the contact then heap-sorts. For busy contacts (10k+ messages)
-- this is O(n) reads per thread load.
--
-- An index on (contact_id, sent_at) lets Postgres scan in order and stop at LIMIT 50:
-- O(50) row reads regardless of how many messages the contact has.
-- Same pattern applies to fb_messages (used in the same threadMessages() helper).

CREATE INDEX IF NOT EXISTS "messages_contact_id_sent_at_idx"
    ON "messages" ("contact_id", "sent_at" DESC);

CREATE INDEX IF NOT EXISTS "fb_messages_contact_id_sent_at_idx"
    ON "fb_messages" ("contact_id", "sent_at" DESC);
