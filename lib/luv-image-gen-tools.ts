/**
 * Luv: Image Generation Tool Definitions
 *
 * Agentic tools for generating images via Gemini Nano Banana models.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { generateLuvImage, listLuvGenerations } from './luv-image-gen';

/**
 * Allowlisted origins for reference image fetching.
 * Only Supabase storage URLs are permitted — prevents SSRF via LLM-supplied URLs.
 */
const ALLOWED_FETCH_ORIGINS = new Set([
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin,
]);

/**
 * Fetch an image URL and return base64 data for use as a reference image.
 * Supports data URLs (from chat) and allowlisted HTTP URLs (Supabase storage only).
 */
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Handle data URLs directly
  if (url.startsWith('data:')) {
    const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    return { mimeType: match[1], base64: match[2] };
  }

  // Validate URL origin against allowlist
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL for reference image');
  }

  if (!['https:', 'http:'].includes(parsed.protocol)) {
    throw new Error(`Disallowed URL protocol: ${parsed.protocol}`);
  }

  if (!ALLOWED_FETCH_ORIGINS.has(parsed.origin)) {
    throw new Error(`Reference image URL origin not allowed: ${parsed.origin}`);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { base64: buffer.toString('base64'), mimeType };
}

export const generateImage = tool({
  description:
    'Generate an image using Gemini Nano Banana models. Write a detailed prompt describing subject, composition, lighting, style, and mood. Optionally pass reference images from the conversation for style/subject consistency (max 4). Returns a public URL for the generated image.',
  inputSchema: zodSchema(
    z.object({
      prompt: z.string().describe('Detailed image generation prompt'),
      referenceImageUrls: z
        .array(z.string())
        .max(4)
        .optional()
        .describe('URLs of images to use as reference (data URLs from chat or Supabase public URLs, max 4)'),
      aspectRatio: z
        .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'])
        .optional()
        .describe('Image aspect ratio (default: 1:1)'),
      imageSize: z
        .enum(['1K', '2K', '4K'])
        .optional()
        .describe('Output resolution: 1K (~1024px), 2K (~2048px), 4K (~4096px). Default: 1K'),
      model: z
        .enum(['nano-banana-2', 'nano-banana-pro'])
        .optional()
        .describe('Model: nano-banana-2 (fast, default) or nano-banana-pro (higher quality)'),
    })
  ),
  execute: async ({ prompt, referenceImageUrls, aspectRatio, imageSize, model }) => {
    try {
      // Resolve reference image URLs to base64
      const referenceImages = referenceImageUrls
        ? await Promise.all(referenceImageUrls.map(urlToBase64))
        : undefined;

      const result = await generateLuvImage({
        prompt,
        referenceImages,
        aspectRatio,
        imageSize,
        model,
      });

      return {
        type: 'image_generation_result' as const,
        success: true,
        imageUrl: result.publicUrl,
        storagePath: result.storagePath,
        prompt: result.prompt,
        model: result.model,
        aspectRatio: aspectRatio ?? '1:1',
        imageSize: imageSize ?? '1K',
        durationMs: result.durationMs,
      };
    } catch (err) {
      return {
        type: 'image_generation_result' as const,
        success: false,
        error: err instanceof Error ? err.message : 'Image generation failed',
      };
    }
  },
});

export const listGenerations = tool({
  description:
    'List recent image generations with their prompts, models, and URLs. Use to reference or build on previous work.',
  inputSchema: zodSchema(
    z.object({
      limit: z.number().min(1).max(50).optional().describe('Number of results (default: 10)'),
    })
  ),
  execute: async ({ limit }) => {
    const results = await listLuvGenerations(limit ?? 10);
    return { generations: results };
  },
});

export const luvImageGenTools = {
  generate_image: generateImage,
  list_generations: listGenerations,
};
