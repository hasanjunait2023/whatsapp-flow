-- Add current_page column to user_presence for activity tracking
ALTER TABLE user_presence 
ADD COLUMN IF NOT EXISTS current_page text;

COMMENT ON COLUMN user_presence.current_page IS 'Current page/route the user is viewing (e.g., inbox, orders, dashboard)';