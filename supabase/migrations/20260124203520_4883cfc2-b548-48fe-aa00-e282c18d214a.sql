-- Add typing indicator column to fb_contacts
ALTER TABLE public.fb_contacts 
ADD COLUMN IF NOT EXISTS typing_at TIMESTAMP WITH TIME ZONE;