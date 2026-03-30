/**
 * Luv: Image Generation Tool Definitions
 *
 * Agentic tools for generating images via Gemini Nano Banana models.
 * generate_image is a factory — it needs model messages injected at
 * request time to extract reference images from the conversation.
 */

import { tool, zodSchema } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { generateLuvImage, listLuvGenerations } from './luv-image-gen';
import { extractRecentChatImages } from './luv-chat-images';

/**
 * Fetch an image URL and return base64 data for use as a reference image.
 * Supports data URLs (from chat) and HTTPS URLs (any origin — the agent
 * only has access to URLs from its own tool results like fetch_series_images).
 */
async function urlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  // Handle data URLs directly
  if (url.startsWith('data:')) {
    const match = url.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    return { mimeType: match[1], base64: match[2] };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL for reference image');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Only HTTPS URLs are allowed for reference images (got ${parsed.protocol})`);
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/png';
  return { base64: buffer.toString('base64'), mimeType };
}



/**
 * Factory: create the generate_image tool with access to current model messages.
 * This allows the tool to extract reference images directly from the conversation
 * rather than requiring the model to pass URLs (which it can't access).
 */
export function createGenerateImageTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Generate a general-purpose image using Gemini Nano Banana models. ' +
      'Write a detailed prompt describing subject, composition, lighting, style, and mood. ' +
      'Use this for creative images, scenes, portraits, or any image where you want direct prompt control. ' +
      'Do NOT use this for chassis-grounded studies (use run_chassis_study) or pencil sketches (use run_sketch_study). ' +
      'Set useRecentChatImages to include images from the conversation as i2i reference. ' +
      'Pass referenceImageUrls for images from other series — get URLs from fetch_series_images or list_generations. ' +
      'Returns a public URL and Cog image ID. Does NOT return the image itself — describe what you observe only after the tool returns.',
    inputSchema: zodSchema(
      z.object({
        prompt: z.string().describe('Detailed image generation prompt'),
        useRecentChatImages: z
          .number()
          .int()
          .min(0)
          .max(4)
          .optional()
          .describe('Number of recent chat images to use as reference (0-4). Extracts from conversation history.'),
        referenceImageUrls: z
          .array(z.string())
          .max(4)
          .optional()
          .describe('Supabase public URLs of previously generated images to use as reference (max 4). Use list_generations to find URLs.'),
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
        templateId: z
          .string()
          .optional()
          .describe('UUID of a luv_prompt_templates row to merge with the prompt — use list_prompt_templates to find'),
      })
    ),
    execute: async ({ prompt, useRecentChatImages, referenceImageUrls, aspectRatio, imageSize, model, templateId }) => {
      try {
        const referenceImages: { base64: string; mimeType: string }[] = [];

        // Extract images from chat conversation
        if (useRecentChatImages && useRecentChatImages > 0) {
          const chatImages = await extractRecentChatImages(messages, useRecentChatImages);
          referenceImages.push(...chatImages);
        }

        // Fetch any explicitly provided URLs (e.g., from previous generations)
        if (referenceImageUrls && referenceImageUrls.length > 0) {
          const urlImages = await Promise.all(referenceImageUrls.map(urlToBase64));
          referenceImages.push(...urlImages);
        }

        // Cap at 4 total
        const finalRefs = referenceImages.slice(0, 4);

        const result = await generateLuvImage({
          prompt,
          referenceImages: finalRefs.length > 0 ? finalRefs : undefined,
          aspectRatio,
          imageSize,
          model,
          templateId,
        });

        return {
          type: 'image_generation_result' as const,
          success: true,
          imageUrl: result.publicUrl,
          storagePath: result.storagePath,
          cogImageId: result.cogImageId,
          cogSeriesId: result.cogSeriesId,
          prompt: result.prompt,
          model: result.model,
          aspectRatio: aspectRatio ?? '1:1',
          imageSize: imageSize ?? '1K',
          durationMs: result.durationMs,
          referenceImageCount: finalRefs.length,
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
}

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
