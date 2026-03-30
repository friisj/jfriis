/**
 * Luv: Unified Reference Image Resolver
 *
 * Single interface for resolving reference images from any source:
 * - Chat conversation (extract from model messages)
 * - Cog image IDs (resolve via cog_images table)
 * - HTTPS URLs (fetch directly — fallback, prefer IDs)
 *
 * All image generation tools use this resolver, giving the agent
 * one consistent interface to learn.
 */

import type { ModelMessage } from 'ai';
import { extractRecentChatImages } from './luv-chat-images';
import { resolveImageAsBase64 } from './luv-image-utils';
import { createClient } from '@supabase/supabase-js';

export interface ResolvedImage {
  base64: string;
  mimeType: string;
}

export interface ImageRefSources {
  /** Extract N most recent images from the conversation */
  fromChat?: number;
  /** Resolve these Cog image IDs via the cog_images table */
  fromCogIds?: string[];
  /** Fetch these HTTPS URLs directly (fallback — prefer IDs) */
  fromUrls?: string[];
}

export interface ImageRefResult {
  images: ResolvedImage[];
  warnings: string[];
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Resolve reference images from multiple sources into a unified array.
 * Sources are resolved in order: chat → Cog IDs → URLs.
 * Results are capped at `maxImages` total.
 */
export async function resolveReferenceImages(
  sources: ImageRefSources,
  messages: ModelMessage[],
  maxImages: number = 4,
): Promise<ImageRefResult> {
  const images: ResolvedImage[] = [];
  const warnings: string[] = [];

  // 1. Chat images (from conversation history)
  if (sources.fromChat && sources.fromChat > 0) {
    try {
      const chatImages = await extractRecentChatImages(messages, sources.fromChat);
      images.push(...chatImages);
    } catch (err) {
      warnings.push(`Failed to extract chat images: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // 2. Cog image IDs (resolved server-side — most reliable for stored images)
  if (sources.fromCogIds && sources.fromCogIds.length > 0) {
    try {
      const client = serviceClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (client as any)
        .from('cog_images')
        .select('id, storage_path')
        .in('id', sources.fromCogIds.slice(0, maxImages));

      // Warn on missing IDs — likely fabricated
      const foundIds = new Set((rows ?? []).map((r: { id: string }) => r.id));
      const missingIds = sources.fromCogIds.filter(id => !foundIds.has(id));
      if (missingIds.length > 0) {
        warnings.push(
          `Reference image IDs not found: ${missingIds.join(', ')}. ` +
          'These may be fabricated — use real IDs from fetch_series_images, list_generations, or list_sketches.'
        );
      }

      if (rows) {
        const settled = await Promise.allSettled(
          rows.map((r: { storage_path: string }) => resolveImageAsBase64(r.storage_path))
        );
        for (const result of settled) {
          if (result.status === 'fulfilled') {
            images.push({ base64: result.value.base64, mimeType: result.value.mediaType });
          }
        }
      }
    } catch (err) {
      warnings.push(`Failed to resolve Cog image IDs: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  // 3. HTTPS URLs (fallback — prefer IDs)
  if (sources.fromUrls && sources.fromUrls.length > 0) {
    for (const url of sources.fromUrls.slice(0, maxImages)) {
      try {
        // Handle data URLs inline
        if (url.startsWith('data:')) {
          const match = url.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
          if (match) {
            images.push({ base64: match[2], mimeType: match[1] });
            continue;
          }
        }

        // Validate HTTPS
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
          warnings.push(`Only HTTPS URLs allowed (got ${parsed.protocol})`);
          continue;
        }

        const res = await fetch(url);
        if (!res.ok) {
          warnings.push(`Failed to fetch ${url}: ${res.status}`);
          continue;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
        images.push({ base64: buffer.toString('base64'), mimeType });
      } catch (err) {
        warnings.push(`Failed to fetch URL: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  }

  return {
    images: images.slice(0, maxImages),
    warnings,
  };
}

/**
 * Zod schema fragment for the unified reference image parameters.
 * Import this into tool definitions to get consistent parameter shapes.
 */
export { z as _z } from 'zod';
import { z } from 'zod';

export const referenceImageSchema = {
  useRecentChatImages: z
    .number()
    .int()
    .min(0)
    .max(4)
    .optional()
    .describe('Number of recent chat images to use as reference (0-4). Extracts from conversation history.'),
  referenceImageIds: z
    .array(z.string())
    .max(4)
    .optional()
    .describe('Cog image IDs to use as reference (max 4). Get real IDs from fetch_series_images, list_generations, or list_sketches — never fabricate UUIDs.'),
};
