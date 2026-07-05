-- Composite index on internal_messages for efficient per-room last-message and
-- unread-count queries. Supports DISTINCT ON (room_id) ORDER BY room_id, created_at DESC
-- in internal-chat-list-rooms and the JOIN-based unread COUNT query.
-- Created with CONCURRENTLY so it doesn't block reads/writes during migration.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "internal_messages_room_created_idx"
  ON "internal_messages" USING btree ("room_id", "created_at" DESC);
