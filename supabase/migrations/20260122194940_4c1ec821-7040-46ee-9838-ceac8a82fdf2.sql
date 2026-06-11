-- Fix malformed media URLs from previous versions
UPDATE messages 
SET media_url = REPLACE(media_url, ';%20codecs=opus', '')
WHERE media_url LIKE '%;%20codecs=opus%';

UPDATE messages 
SET media_mime_type = SPLIT_PART(media_mime_type, ';', 1)
WHERE media_mime_type LIKE '%;%';

-- Add sent_by_user_id column to track which team member sent a message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_by_user_id UUID REFERENCES auth.users(id);

-- Add replying presence columns to contacts for live typing indicator
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS replying_user_id UUID REFERENCES auth.users(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS replying_started_at TIMESTAMPTZ;

-- Create index for faster lookup of replying users
CREATE INDEX IF NOT EXISTS idx_contacts_replying ON contacts(replying_user_id) WHERE replying_user_id IS NOT NULL;