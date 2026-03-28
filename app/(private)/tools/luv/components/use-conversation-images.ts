'use client';

import { useMemo } from 'react';
import type { UIMessage } from 'ai';

export interface ConversationImage {
  /** Sequential ID within the conversation (1-based) */
  index: number;
  /** The image URL (public URL, blob URL, or data URL) */
  url: string;
  /** Source: user upload, generated, tool result, markdown */
  source: 'user' | 'generated' | 'tool' | 'markdown';
  /** Message ID this image belongs to */
  messageId: string;
  /** Optional filename */
  filename?: string;
}

/**
 * Extract all images from conversation messages in order of appearance.
 * Returns a map of URL → ConversationImage for quick lookup,
 * and an ordered array for manifests.
 */
export function useConversationImages(messages: UIMessage[]): {
  images: ConversationImage[];
  imageByUrl: Map<string, ConversationImage>;
  getImageIndex: (url: string) => number | null;
} {
  return useMemo(() => {
    const images: ConversationImage[] = [];
    const imageByUrl = new Map<string, ConversationImage>();
    let counter = 0;

    for (const msg of messages) {
      for (const part of msg.parts) {
        // User-uploaded file images
        if (part.type === 'file' && 'url' in part && typeof part.url === 'string') {
          const fp = part as { url: string; mediaType?: string; filename?: string };
          if (fp.mediaType?.startsWith('image/') || fp.url.match(/\.(png|jpg|jpeg|gif|webp)/i)) {
            counter++;
            const img: ConversationImage = {
              index: counter,
              url: fp.url,
              source: 'user',
              messageId: msg.id,
              filename: fp.filename,
            };
            images.push(img);
            imageByUrl.set(fp.url, img);
          }
        }

        // Text parts — scan for markdown images and inline image URLs
        if (part.type === 'text' && msg.role === 'assistant') {
          const text = (part as { text: string }).text;
          // Match markdown images: ![alt](url)
          const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
          let match;
          while ((match = mdRegex.exec(text)) !== null) {
            const url = match[2];
            if (!imageByUrl.has(url)) {
              counter++;
              const img: ConversationImage = {
                index: counter,
                url,
                source: 'markdown',
                messageId: msg.id,
              };
              images.push(img);
              imageByUrl.set(url, img);
            }
          }
        }

        // Tool result images — check for known result types
        if ('toolName' in part && 'output' in part) {
          const output = (part as { output: unknown }).output;
          if (typeof output === 'object' && output !== null) {
            const r = output as Record<string, unknown>;

            // Image generation result
            if (r.type === 'image_generation_result' && r.success && typeof r.imageUrl === 'string') {
              if (!imageByUrl.has(r.imageUrl)) {
                counter++;
                const img: ConversationImage = {
                  index: counter,
                  url: r.imageUrl,
                  source: 'generated',
                  messageId: msg.id,
                };
                images.push(img);
                imageByUrl.set(r.imageUrl, img);
              }
            }

            // Chassis study result
            if (r.type === 'chassis_study_result' && r.success && typeof r.imageUrl === 'string') {
              if (!imageByUrl.has(r.imageUrl)) {
                counter++;
                const img: ConversationImage = {
                  index: counter,
                  url: r.imageUrl,
                  source: 'generated',
                  messageId: msg.id,
                };
                images.push(img);
                imageByUrl.set(r.imageUrl, img);
              }
            }

            // Generic tool images (fetch_series_images, view_module_media)
            if (Array.isArray(r.images)) {
              for (const toolImg of r.images as Array<Record<string, unknown>>) {
                if (typeof toolImg.url === 'string' && !imageByUrl.has(toolImg.url)) {
                  counter++;
                  const img: ConversationImage = {
                    index: counter,
                    url: toolImg.url,
                    source: 'tool',
                    messageId: msg.id,
                    filename: toolImg.filename as string | undefined,
                  };
                  images.push(img);
                  imageByUrl.set(toolImg.url, img);
                }
              }
            }
          }
        }
      }
    }

    const getImageIndex = (url: string): number | null => {
      return imageByUrl.get(url)?.index ?? null;
    };

    return { images, imageByUrl, getImageIndex };
  }, [messages]);
}
