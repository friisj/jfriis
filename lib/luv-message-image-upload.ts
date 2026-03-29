/**
 * Server-only: upload user chat images to Supabase Storage and register
 * them in cog_images so the agent can reference them by ID (e.g. for i2i).
 * Separated from luv-message-utils.ts to avoid pulling supabase-server
 * (which imports next/headers) into the client bundle.
 */

import type { UIMessage } from 'ai';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface StoredImage {
  url: string;
  cogImageId: string;
}

/**
 * Upload image file parts from a user message to Supabase Storage
 * and create cog_images rows so the agent can reference them by ID.
 * Returns a map of part index → { url, cogImageId }.
 */
export async function uploadUserMessageImages(
  msg: UIMessage,
  conversationId: string,
): Promise<Map<number, StoredImage>> {
  // Use service role key — consistent with all other server-side writes to cog-images
  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const results = new Map<number, StoredImage>();

  for (let i = 0; i < msg.parts.length; i++) {
    const part = msg.parts[i];
    if (part.type !== 'file') continue;
    const fp = part as { type: string; mediaType?: string; url?: string; data?: unknown; filename?: string };
    if (!fp.mediaType?.startsWith('image/')) continue;

    // If the URL already points to our storage bucket, keep it — no re-upload needed
    if (fp.url && fp.url.includes('/storage/v1/object/public/cog-images/')) {
      // Try to find existing cog_images row by storage path
      const urlParts = fp.url.split('/cog-images/');
      const storagePath = urlParts[1] ?? '';
      if (storagePath) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (client as any)
          .from('cog_images')
          .select('id')
          .eq('storage_path', storagePath)
          .maybeSingle();
        results.set(i, { url: fp.url, cogImageId: existing?.id ?? '' });
      } else {
        results.set(i, { url: fp.url, cogImageId: '' });
      }
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

      // Create cog_images row so agent can reference this image by ID
      let cogImageId = '';
      try {
        const { createLuvCogImageServer } = await import('./luv/cog-integration-server');
        const cogImage = await createLuvCogImageServer({
          seriesKey: 'references',
          storagePath,
          filename: fp.filename ?? `chat-upload-${Date.now()}.${ext}`,
          mimeType: mimeType ?? 'image/jpeg',
          source: 'upload',
          metadata: {
            type: 'chat_upload',
            conversationId,
          },
        });
        cogImageId = cogImage.id;
      } catch (err) {
        console.error('[luv-image-upload] Failed to create cog_images row:', err);
      }

      results.set(i, { url: publicUrl, cogImageId });
    } catch (err) {
      console.error('[luv-image-upload] Upload error:', err);
    }
  }

  return results;
}
