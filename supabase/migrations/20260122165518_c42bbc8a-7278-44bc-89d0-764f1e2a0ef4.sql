-- Create storage bucket for workspace logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own workspace logos
CREATE POLICY "Owners can upload workspace logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'workspace-logos' 
  AND auth.uid() IS NOT NULL
);

-- Allow anyone to view workspace logos (public bucket)
CREATE POLICY "Anyone can view workspace logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'workspace-logos');

-- Allow owners to update their workspace logos
CREATE POLICY "Owners can update workspace logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'workspace-logos' AND auth.uid() IS NOT NULL);

-- Allow owners to delete their workspace logos
CREATE POLICY "Owners can delete workspace logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'workspace-logos' AND auth.uid() IS NOT NULL);