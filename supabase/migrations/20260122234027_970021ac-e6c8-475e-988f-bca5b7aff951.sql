-- Add column to track messages synced from other devices
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_synced_from_device BOOLEAN DEFAULT false;

COMMENT ON COLUMN messages.is_synced_from_device IS 'True if message was sent from phone/WhatsApp Web and synced via webhook';