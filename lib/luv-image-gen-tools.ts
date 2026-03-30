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
import { resolveReferenceImages, referenceImageSchema } from './luv-image-refs';



/**
 * Factory: create the generate_image tool with access to current model messages.
 * This allows the tool to extract reference images directly from the conversation
 * rather than requiring the model to pass URLs (which it can't access).
 */
export function createGenerateImageTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Generate an image using Gemini Nano Banana models. This is the DEFAULT image generation tool — use it for any image request unless the user specifically asks for a chassis "study" or pencil "sketch". ' +
      'Write a detailed prompt describing subject, composition, lighting, style, and mood. ' +
      'Use for: portraits, creative images, scenes, style explorations, appearance testing, outfit concepts. ' +
      'Pass referenceImageIds with Cog image IDs from fetch_series_images, list_generations, or list_sketches for i2i conditioning. ' +
      'Set useRecentChatImages to include images from the conversation. ' +
      'Returns a public URL and Cog image ID. Does NOT return the image itself — describe what you observe only after the tool returns.',
    inputSchema: zodSchema(
      z.object({
        prompt: z.string().describe('Detailed image generation prompt'),
        ...referenceImageSchema,
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
    execute: async ({ prompt, useRecentChatImages, referenceImageIds, aspectRatio, imageSize, model, templateId }) => {
      try {
        const { images: finalRefs, warnings: refWarnings } = await resolveReferenceImages(
          { fromChat: useRecentChatImages, fromCogIds: referenceImageIds },
          messages,
          4,
        );

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
          ...(refWarnings.length > 0 ? { warnings: refWarnings } : {}),
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
