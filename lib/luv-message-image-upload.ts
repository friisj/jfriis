/**
 * Server-only: upload user chat images to Supabase Storage.
 * Separated from luv-message-utils.ts to avoid pulling supabase-server
 * (which imports next/headers) into the client bundle.
 */

import type { UIMessage } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Upload image file parts from a user message to Supabase Storage.
 * Returns a map of part index → public URL for each uploaded image.
 */
export async function uploadUserMessageImages(
  msg: UIMessage,
  conversationId: string,
): Promise<Map<number, string>> {
  // Use service role key — consistent with all other server-side writes to cog-images
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const urls = new Map<number, string>();

  for (let i = 0; i < msg.parts.length; i++) {
    const part = msg.parts[i];
    if (part.type !== 'file') continue;
    const fp = part as { type: string; mediaType?: string; url?: string; data?: unknown };
    if (!fp.mediaType?.startsWith('image/')) continue;

    // If the URL already points to our storage bucket, keep it — no re-upload needed
    if (fp.url && fp.url.includes('/storage/v1/object/public/cog-images/')) {
      urls.set(i, fp.url);
      continue;
    }

    // Extract base64 from the file part's URL (data URL) or data field
    let base64: string | null = null;
    let mimeType = fp.mediaType;

    if (fp.url && fp.url.startsWith('data:')) {
      const match = fp.url.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }
    } else if (typeof fp.data === 'string' && fp.data.startsWith('data:')) {
      const match = fp.data.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64 = match[2];
      }
    } else if (typeof fp.data === 'string' && fp.data.length > 100 && /^[A-Za-z0-9+/=]+$/.test(fp.data.slice(0, 100))) {
      base64 = fp.data;
    }

    if (!base64) continue;

    try {
      const extMap: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = extMap[mimeType ?? ''] ?? 'jpg';
      const storagePath = `luv/chat-images/${conversationId}/${Date.now()}-${i}.${ext}`;
      const buffer = Buffer.from(base64, 'base64');

      const { error: uploadError } = await client.storage
        .from('cog-images')
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

      if (uploadError) {
        console.error('[luv-image-upload] Upload failed:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = client.storage.from('cog-images').getPublicUrl(storagePath);
      urls.set(i, publicUrl);
    } catch (err) {
      console.error('[luv-image-upload] Upload error:', err);
    }
  }

  return urls;
}
