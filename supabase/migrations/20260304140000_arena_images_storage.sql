-- Arena: RLS policies for arena-images storage bucket
-- Bucket was created manually in Supabase dashboard

CREATE POLICY "Admin can upload arena images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'arena-images'
    AND is_admin()
  );

CREATE POLICY "Public can view arena images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'arena-images');

CREATE POLICY "Admin can update arena images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'arena-images'
    AND is_admin()
  );

CREATE POLICY "Admin can delete arena images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'arena-images'
    AND is_admin()
  );
