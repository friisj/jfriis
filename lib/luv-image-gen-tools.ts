/**
 * Luv: Image Generation Tool Definitions
 *
 * Two-phase async pattern:
 *   start_image_generation — resolves refs, creates job row, returns jobId
 *   check_gen_job (shared) — executes the pipeline if pending, returns result
 *
 * This decouples job creation from execution so the agent can continue
 * talking while generation runs, and multiple jobs can run in parallel.
 */

import { tool, zodSchema } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { listLuvGenerations } from './luv-image-gen';
import { resolveReferenceImages, referenceImageSchema } from './luv-image-refs';
import { submitGenJob } from './luv-gen-jobs';

/**
 * Factory: create the start_image_generation tool.
 * Resolves reference images, creates a gen job row, returns jobId immediately.
 * The actual generation happens when check_gen_job is called.
 */
export function createStartImageGenTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Start an image generation job using Gemini Nano Banana models. Returns a jobId — ' +
      'call check_gen_job with the jobId to get the result (this may take 10-30 seconds). ' +
      'This is the DEFAULT image generation tool — use it for any image request unless the user specifically asks for a chassis "study" or pencil "sketch". ' +
      'Write a detailed prompt describing subject, composition, lighting, style, and mood. ' +
      'Pass referenceImageIds with Cog image IDs for i2i conditioning. ' +
      'You can start multiple generation jobs in one step, then check them all with separate check_gen_job calls.',
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
        // Resolve reference images now (before job creation) so base64 data is captured
        const { images: finalRefs, warnings: refWarnings } = await resolveReferenceImages(
          { fromChat: useRecentChatImages, fromCogIds: referenceImageIds },
          messages,
          4,
        );

        const jobId = await submitGenJob('image', {
          prompt,
          referenceImages: finalRefs.length > 0 ? finalRefs : undefined,
          aspectRatio,
          imageSize,
          model,
          templateId,
        });

        return {
          type: 'gen_job_started' as const,
          success: true,
          jobId,
          jobType: 'image',
          message: `Image generation job started. Call check_gen_job with jobId "${jobId}" to get the result.`,
          referenceImageCount: finalRefs.length,
          ...(refWarnings.length > 0 ? { warnings: refWarnings } : {}),
        };
      } catch (err) {
        return {
          type: 'gen_job_started' as const,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to start image generation',
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
