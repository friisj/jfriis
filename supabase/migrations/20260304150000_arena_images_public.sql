-- Make arena-images bucket public for image display
UPDATE storage.buckets
SET public = true
WHERE id = 'arena-images';
