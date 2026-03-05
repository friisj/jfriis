/**
 * Luv: Image Resolution Utilities
 *
 * Server-side helpers for resolving Supabase storage paths to base64 data
 * or public URLs, used by vision tools.
 */

import { createClient } from './supabase-server';

const LUV_MEDIA_BUCKET = 'luv-media';

export type MediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

function inferMediaType(path: string): MediaType {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/png';
  }
}

export async function resolveImageAsBase64(
  storagePath: string
): Promise<{ base64: string; mediaType: MediaType }> {
  const client = await createClient();
  const { data, error } = await client.storage
    .from(LUV_MEDIA_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Failed to download image: ${error?.message ?? 'no data'}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = inferMediaType(storagePath);

  return { base64, mediaType };
}

export function resolveImagePublicUrl(storagePath: string): string {
  // Use env var directly since we don't need auth for public URLs
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${LUV_MEDIA_BUCKET}/${storagePath}`;
}
