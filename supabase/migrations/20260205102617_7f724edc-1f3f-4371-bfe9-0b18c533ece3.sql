-- Add wa_group_id column to messages table for group message routing
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS wa_group_id text;

-- Create index for efficient group message queries
CREATE INDEX IF NOT EXISTS idx_messages_wa_group_id ON messages(wa_group_id);

-- Add new columns to whatsapp_groups for inbox functionality
ALTER TABLE whatsapp_groups
ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
ADD COLUMN IF NOT EXISTS last_message_preview text,
ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_created_by_tenant boolean DEFAULT false;

-- Add sender_phone column to messages for group message sender identification
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sender_phone text;

-- Create index for group inbox ordering
CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_last_message_at ON whatsapp_groups(tenant_id, last_message_at DESC NULLS LAST);