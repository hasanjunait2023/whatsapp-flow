-- First, clean up duplicate welcome messages keeping only the oldest one per contact
DELETE FROM whatsapp_auto_message_log 
WHERE id IN (
  SELECT id FROM (
    SELECT id, 
           ROW_NUMBER() OVER (PARTITION BY contact_id ORDER BY sent_at ASC) as rn
    FROM whatsapp_auto_message_log 
    WHERE message_type = 'welcome'
  ) t 
  WHERE rn > 1
);

-- Now create the unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_auto_message_log_welcome_unique 
ON whatsapp_auto_message_log (contact_id) 
WHERE message_type = 'welcome';

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_whatsapp_auto_message_log_welcome_unique IS 
'Ensures only one welcome message per contact to prevent duplicates';