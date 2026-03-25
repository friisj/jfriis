/**
 * Shared utility for extracting images from Luv chat messages.
 * Used by both image gen tools and chassis study tools.
 */

import type { ModelMessage } from 'ai';

/**
 * Extract up to `count` recent images from model messages (most recent first).
 * Scans user messages for image/file parts and extracts base64 data.
 */
export function extractRecentChatImages(
  messages: ModelMessage[],
  count: number,
): { base64: string; mimeType: string }[] {
  const images: { base64: string; mimeType: string }[] = [];

  for (let i = messages.length - 1; i >= 0 && images.length < count; i--) {
    const msg = messages[i];
    if (msg.role !== 'user' || typeof msg.content === 'string') continue;

    for (const part of msg.content) {
      if (images.length >= count) break;

      if (part.type === 'image') {
        const data = part.image;
        let base64: string | null = null;
        if (typeof data === 'string') {
          if (data.startsWith('data:')) {
            const match = data.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
            if (match) {
              images.push({ mimeType: match[1], base64: match[2] });
              continue;
            }
          }
          base64 = data;
        } else if (Buffer.isBuffer(data)) {
          base64 = data.toString('base64');
        } else if (data instanceof Uint8Array) {
          base64 = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
        }
        if (base64) {
          images.push({ mimeType: part.mediaType ?? 'image/jpeg', base64 });
        }
      } else if (part.type === 'file' && part.mediaType?.startsWith('image/')) {
        const data = part.data;
        let base64: string | null = null;
        if (typeof data === 'string') {
          if (data.startsWith('data:')) {
            const match = data.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
            if (match) {
              images.push({ mimeType: match[1], base64: match[2] });
              continue;
            }
          }
          base64 = data;
        } else if (Buffer.isBuffer(data)) {
          base64 = data.toString('base64');
        } else if (data instanceof Uint8Array) {
          base64 = Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('base64');
        }
        if (base64) {
          images.push({ mimeType: part.mediaType, base64 });
        }
      }
    }
  }

  return images;
}
