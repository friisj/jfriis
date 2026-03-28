/**
 * Luv: Image Resolution Utilities
 *
 * Server-side helpers for resolving Supabase storage paths to base64 data
 * or public URLs, used by vision tools.
 */

export type MediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

/**
 * Determine which storage bucket an image lives in.
 * All cog_images records use `cog-images` bucket.
 * Only legacy luv_references/luv_generations used `luv-images`.
 */
export function resolveStorageBucket(_storagePath: string): string {
  return 'cog-images';
}

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
  const url = resolveImagePublicUrl(storagePath);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mediaType = inferMediaType(storagePath);

  return { base64, mediaType };
}

export function resolveImagePublicUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = resolveStorageBucket(storagePath);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
}
