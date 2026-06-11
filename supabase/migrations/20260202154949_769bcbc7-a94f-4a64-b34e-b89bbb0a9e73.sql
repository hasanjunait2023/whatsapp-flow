-- Add column to track one-time profile picture fetch attempt
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS profile_pic_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.profile_pic_synced_at IS 'Timestamp when profile picture was fetched from WhatsApp. NULL means not yet attempted.';