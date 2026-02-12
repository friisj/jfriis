'use server';

import { createClient } from '@/lib/supabase-server';
import { createImageServer } from '@/lib/cog-server';
import type { CogImageSource } from '@/lib/types/cog';

export async function downloadAndStoreStockImage(input: {
  url: string;
  source: 'unsplash' | 'pexels';
  sourceId: string;
  photographer: string;
  photographerUrl: string;
  seriesId: string;
}): Promise<{ imageId: string }> {
  const { url, source, sourceId, photographer, photographerUrl, seriesId } = input;

  // Download image
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  const blob = await res.blob();

  // Upload to Supabase storage
  const ext = 'jpg';
  const filename = `stock-${source}-${sourceId}.${ext}`;
  const storagePath = `${seriesId}/${filename}`;

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Create CogImage record
  const image = await createImageServer({
    series_id: seriesId,
    storage_path: storagePath,
    filename,
    mime_type: 'image/jpeg',
    file_size: blob.size,
    source: source as CogImageSource,
    metadata: {
      photographer,
      photographerUrl,
      stockPhotoId: sourceId,
    },
  });

  // Unsplash API guidelines: trigger download endpoint
  if (source === 'unsplash') {
    const apiKey = process.env.UNSPLASH_ACCESS_KEY;
    if (apiKey) {
      fetch(`https://api.unsplash.com/photos/${sourceId}/download`, {
        headers: { Authorization: `Client-ID ${apiKey}` },
      }).catch(() => {
        // Non-critical — don't fail the main operation
      });
    }
  }

  return { imageId: image.id };
}
