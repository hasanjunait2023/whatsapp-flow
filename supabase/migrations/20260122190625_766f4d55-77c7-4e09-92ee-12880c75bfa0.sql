-- Create chat-media storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to chat-media bucket
CREATE POLICY "Authenticated users can upload chat media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media');

-- Allow public read access to chat media (needed for WasenderAPI to fetch)
CREATE POLICY "Public read access for chat media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'chat-media');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update chat media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete chat media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media');

-- Add media metadata columns to messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS media_filename TEXT,
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;