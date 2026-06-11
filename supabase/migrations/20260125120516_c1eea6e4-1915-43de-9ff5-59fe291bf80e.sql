-- Create demo-product-images storage bucket for demo product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-product-images', 'demo-product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read images
CREATE POLICY "Public read access for demo product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'demo-product-images');

-- Allow authenticated users to upload demo images
CREATE POLICY "Authenticated users can upload demo images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'demo-product-images');