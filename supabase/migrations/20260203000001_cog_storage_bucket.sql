-- Cog: Storage bucket for images
-- Creates private bucket for cog-images

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cog-images',
  'cog-images',
  false,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (admin-only access)
CREATE POLICY "Admin can upload cog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cog-images'
    AND is_admin()
  );

CREATE POLICY "Admin can view cog images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cog-images'
    AND is_admin()
  );

CREATE POLICY "Admin can update cog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cog-images'
    AND is_admin()
  );

CREATE POLICY "Admin can delete cog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cog-images'
    AND is_admin()
  );
