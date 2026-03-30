'use client';

import { useMemo } from 'react';
import type { UIMessage } from 'ai';

export interface ConversationImage {
  /** Sequential ID within the conversation (1-based) */
  index: number;
  /** The canonical image URL */
  url: string;
  /** Source: user upload, generated, tool result, markdown */
  source: 'user' | 'generated' | 'tool' | 'markdown';
  /** Message ID this image belongs to */
  messageId: string;
  /** Optional filename */
  filename?: string;
  /** Cog image ID if available */
  cogImageId?: string;
}

/**
 * Normalize a URL for deduplication. Strips query params and trailing slashes,
 * decodes percent-encoding, and lowercases the scheme+host.
 */
function normalizeUrl(url: string): string {
  // Skip data URLs and blob URLs
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  try {
    const parsed = new URL(url);
    // Lowercase scheme + host, keep path as-is, strip query/hash
    return `${parsed.protocol}//${parsed.host}${decodeURIComponent(parsed.pathname)}`;
  } catch {
    return url;
  }
}

/**
 * Extract all images from conversation messages in order of appearance.
 *
 * Processing order per message:
 *   1. User file parts (uploads)
 *   2. Tool results (generated images, fetched series images)
 *   3. Markdown images in assistant text (deduplicated against tool results)
 *
 * URLs are normalized before dedup so slight variations don't cause duplicates.
 */
export function useConversationImages(messages: UIMessage[]): {
  images: ConversationImage[];
  imageByUrl: Map<string, ConversationImage>;
  getImageIndex: (url: string) => number | null;
} {
  return useMemo(() => {
    const images: ConversationImage[] = [];
    // Map normalized URL → ConversationImage for dedup
    const byNormalizedUrl = new Map<string, ConversationImage>();
    // Map raw URL → ConversationImage for lookup (consumers pass raw URLs)
    const imageByUrl = new Map<string, ConversationImage>();
    let counter = 0;

    function register(url: string, source: ConversationImage['source'], messageId: string, extra?: { filename?: string; cogImageId?: string }): ConversationImage | null {
      const key = normalizeUrl(url);
      if (byNormalizedUrl.has(key)) {
        // Already registered — add raw URL alias for lookup
        const existing = byNormalizedUrl.get(key)!;
        imageByUrl.set(url, existing);
        return null;
      }

      counter++;
      const img: ConversationImage = {
        index: counter,
        url,
        source,
        messageId,
        filename: extra?.filename,
        cogImageId: extra?.cogImageId,
      };
      images.push(img);
      byNormalizedUrl.set(key, img);
      imageByUrl.set(url, img);
      return img;
    }

    for (const msg of messages) {
      // Pass 1: User file parts
      for (const part of msg.parts) {
        if (part.type !== 'file') continue;
        const fp = part as { url?: string; mediaType?: string; filename?: string; cogImageId?: string };
        if (!fp.url || typeof fp.url !== 'string') continue;
        if (!fp.mediaType?.startsWith('image/') && !fp.url.match(/\.(png|jpg|jpeg|gif|webp)/i)) continue;
        register(fp.url, 'user', msg.id, { filename: fp.filename, cogImageId: fp.cogImageId });
      }

      // Pass 2: Tool results (before markdown — so tool images take priority)
      for (const part of msg.parts) {
        if (!('toolName' in part) || !('output' in part)) continue;
        const output = (part as { output: unknown }).output;
        if (typeof output !== 'object' || output === null) continue;
        const r = output as Record<string, unknown>;

        // Image generation / sketch study / chassis study results
        if (
          (r.type === 'image_generation_result' || r.type === 'sketch_study_result' || r.type === 'chassis_study_result') &&
          r.success &&
          typeof r.imageUrl === 'string'
        ) {
          register(r.imageUrl, 'generated', msg.id, {
            cogImageId: typeof r.cogImageId === 'string' ? r.cogImageId : undefined,
          });
        }

        // Generic tool images (fetch_series_images, list_sketches, etc.)
        if (Array.isArray(r.images)) {
          for (const toolImg of r.images as Array<Record<string, unknown>>) {
            if (typeof toolImg.url === 'string') {
              register(toolImg.url, 'tool', msg.id, {
                filename: typeof toolImg.filename === 'string' ? toolImg.filename : undefined,
                cogImageId: typeof toolImg.id === 'string' ? toolImg.id : undefined,
              });
            }
          }
        }

        // Sketches from list_sketches (uses 'sketches' array)
        if (Array.isArray(r.sketches)) {
          for (const sketch of r.sketches as Array<Record<string, unknown>>) {
            if (typeof sketch.url === 'string') {
              register(sketch.url, 'tool', msg.id, {
                cogImageId: typeof sketch.id === 'string' ? sketch.id : undefined,
              });
            }
          }
        }
      }

      // Pass 3: Markdown images in assistant text (deduped against passes 1+2)
      if (msg.role === 'assistant') {
        for (const part of msg.parts) {
          if (part.type !== 'text') continue;
          const text = (part as { text: string }).text;
          const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
          let match;
          while ((match = mdRegex.exec(text)) !== null) {
            register(match[2], 'markdown', msg.id);
          }
        }
      }
    }

    const getImageIndex = (url: string): number | null => {
      // Try exact match first, then normalized
      const direct = imageByUrl.get(url);
      if (direct) return direct.index;
      const normalized = byNormalizedUrl.get(normalizeUrl(url));
      return normalized?.index ?? null;
    };

    return { images, imageByUrl, getImageIndex };
  }, [messages]);
}
