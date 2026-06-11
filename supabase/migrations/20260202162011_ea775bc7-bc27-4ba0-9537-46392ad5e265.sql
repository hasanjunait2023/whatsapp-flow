-- Add profile_pic_synced_at column to fb_contacts for persistent storage tracking
ALTER TABLE public.fb_contacts
ADD COLUMN IF NOT EXISTS profile_pic_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.fb_contacts.profile_pic_synced_at IS 
  'Timestamp when profile picture was last synced to Supabase Storage. NULL means never attempted.';