-- Add column to track when a contact (customer) is typing from their phone
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS device_typing_at TIMESTAMPTZ;

-- Create index for efficient lookup of typing contacts
CREATE INDEX IF NOT EXISTS idx_contacts_device_typing ON contacts(device_typing_at) WHERE device_typing_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN contacts.device_typing_at IS 'Timestamp when typing indicator was received from device. Auto-expires after a few seconds.';