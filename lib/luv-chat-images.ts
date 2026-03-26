/**
 * Shared utility for extracting images from Luv chat messages.
 * Used by both image gen tools and chassis study tools.
 */

import type { ModelMessage } from 'ai';

/**
 * Extract base64 from any DataContent format the AI SDK might use:
 * string (raw base64 or data URL), Buffer, Uint8Array, ArrayBuffer, URL object.
 * Returns null for hosted URLs (http/https) — those need async fetch.
 */
function resolveBase64(data: unknown): { base64: string; mimeType?: string } | null {
  if (data instanceof URL) {
    const str = data.toString();
    const match = str.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (match) return { base64: match[2], mimeType: match[1] };
    return null; // hosted URL — can't extract base64 without fetch
  }
  if (typeof data === 'string') {
    // Data URL — extract base64 payload
    if (data.startsWith('data:')) {
      const match = data.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
      if (match) return { base64: match[2], mimeType: match[1] };
    }
    // Hosted URL — skip (not base64)
    if (data.startsWith('http://') || data.startsWith('https://')) {
      return null;
    }
    // Raw base64 string (no URL prefix, long enough to be image data)
    if (data.length > 100 && /^[A-Za-z0-9+/=]+$/.test(data.slice(0, 100))) {
      return { base64: data };
    }
    return null;
  }
  if (Buffer.isBuffer(data)) {
    return { base64: data.toString('base64') };
  }
  if (data instanceof ArrayBuffer) {
    return { base64: Buffer.from(data).toString('base64') };
  }
  if (data instanceof Uint8Array) {
    return { base64: Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64') };
  }
  return null;
}

/**
 * Fetch a hosted image URL and return as base64.
 */
async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    if (!mimeType.startsWith('image/')) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { base64: buffer.toString('base64'), mimeType };
  } catch {
    return null;
  }
}

/**
 * Resolve data to base64, fetching hosted URLs if needed.
 */
async function resolveImageData(data: unknown): Promise<{ base64: string; mimeType?: string } | null> {
  // Try sync resolution first
  const sync = resolveBase64(data);
  if (sync) return sync;

  // If it's a hosted URL string, fetch it
  if (typeof data === 'string' && (data.startsWith('http://') || data.startsWith('https://'))) {
    return fetchImageAsBase64(data);
  }
  if (data instanceof URL) {
    const str = data.toString();
    if (str.startsWith('http://') || str.startsWith('https://')) {
      return fetchImageAsBase64(str);
    }
  }

  return null;
}

/**
 * Extract up to `count` recent images from model messages (most recent first).
 * Scans user messages for image/file parts and extracts base64 data.
 *
 * Handles AI SDK v6 model message formats:
 * - ImagePart: { type: 'image', image: DataContent | URL, mediaType? }
 * - FilePart:  { type: 'file', data: DataContent | URL, mediaType }
 */
export async function extractRecentChatImages(
  messages: ModelMessage[],
  count: number,
): Promise<{ base64: string; mimeType: string }[]> {
  const images: { base64: string; mimeType: string }[] = [];

  for (let i = messages.length - 1; i >= 0 && images.length < count; i--) {
    const msg = messages[i];
    if (msg.role !== 'user' || typeof msg.content === 'string') continue;

    for (const part of msg.content) {
      if (images.length >= count) break;

      if (part.type === 'image') {
        const resolved = await resolveImageData(part.image);
        if (resolved) {
          images.push({
            base64: resolved.base64,
            mimeType: resolved.mimeType ?? part.mediaType ?? 'image/jpeg',
          });
        }
      } else if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
        const resolved = await resolveImageData(part.data);
        if (resolved) {
          images.push({
            base64: resolved.base64,
            mimeType: resolved.mimeType ?? part.mediaType,
          });
        }
      }
    }
  }

  return images;
}
