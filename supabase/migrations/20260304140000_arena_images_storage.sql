-- Arena: RLS policies for arena-images storage bucket
-- Bucket was created manually in Supabase dashboard

DROP POLICY IF EXISTS "Admin can upload arena images" ON storage.objects;
CREATE POLICY "Admin can upload arena images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'arena-images'
    AND is_admin()
  );

DROP POLICY IF EXISTS "Public can view arena images" ON storage.objects;
CREATE POLICY "Public can view arena images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'arena-images');

DROP POLICY IF EXISTS "Admin can update arena images" ON storage.objects;
CREATE POLICY "Admin can update arena images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'arena-images'
    AND is_admin()
  );

DROP POLICY IF EXISTS "Admin can delete arena images" ON storage.objects;
CREATE POLICY "Admin can delete arena images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'arena-images'
    AND is_admin()
  );
