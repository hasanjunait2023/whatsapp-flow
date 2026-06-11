-- Performance indexes for Internal Chat
CREATE INDEX IF NOT EXISTS idx_internal_chat_members_room_user 
  ON internal_chat_members(room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_internal_chat_members_user 
  ON internal_chat_members(user_id);

CREATE INDEX IF NOT EXISTS idx_internal_messages_room_created 
  ON internal_messages(room_id, created_at DESC);