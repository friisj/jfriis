-- Make cog-images bucket public for image display
UPDATE storage.buckets
SET public = true
WHERE id = 'cog-images';

-- Add public read policy for viewing images
CREATE POLICY "Public can view cog images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'cog-images');
