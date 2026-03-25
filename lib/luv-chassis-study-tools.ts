/**
 * Luv: Chassis Study Tool Definitions
 *
 * Agentic tools for running chassis studies — advanced image generation
 * pipelines where a Gemini thinking subagent shapes a brief from chassis
 * parameters, then generates an image grounded in the character spec.
 *
 * run_chassis_study is a factory — it needs model messages injected at
 * request time to extract reference images from the conversation.
 */

import { tool, zodSchema } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { runChassisStudyPipeline } from './luv-chassis-study-pipeline';
import { resolveImagePublicUrl } from './luv-image-utils';

/**
 * Extract up to `count` recent images from model messages (most recent first).
 * Duplicated from luv-image-gen-tools.ts to avoid coupling — kept minimal.
 */
function extractRecentImages(
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

/**
 * Factory: create the run_chassis_study tool with access to current model messages.
 * This allows the tool to extract reference images from the conversation for i2i bolstering.
 */
export function createChassisStudyTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Run a chassis study — an advanced image generation pipeline that explores a specific aspect of Luv\'s character design. ' +
      'A Gemini thinking subagent generates a structured brief from chassis parameters, then shapes a honed prompt that\'s passed ' +
      'to Gemini image generation along with canonical reference images. Use this for focused explorations of how chassis ' +
      'parameters manifest visually. The user\'s natural language request is the primary input — extract goal, style, module ' +
      'focus, and dynamics from their description. Set useRecentChatImages to include images from the conversation as additional references.',
    inputSchema: zodSchema(
      z.object({
        userPrompt: z
          .string()
          .describe('Natural language description of what to study — the primary input from the user'),
        goal: z
          .string()
          .optional()
          .describe('Specific goal for the study (e.g. "explore how heterochromia looks in soft light")'),
        style: z
          .string()
          .optional()
          .describe('Visual style direction (e.g. "editorial portrait", "soft natural light", "dramatic chiaroscuro")'),
        moduleSlugs: z
          .array(z.string())
          .optional()
          .describe('Chassis module slugs to focus on (e.g. ["eyes", "hair"]). Omit for full-character study.'),
        dynamics: z
          .string()
          .optional()
          .describe('Dynamic qualities to capture (e.g. "wind in hair", "subtle smile", "looking away")'),
        focusArea: z
          .string()
          .optional()
          .describe('Specific anatomical/design area to emphasize'),
        aspectRatio: z
          .enum(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9'])
          .optional()
          .describe('Image aspect ratio (default: 3:4 — portrait)'),
        imageSize: z
          .enum(['1K', '2K', '4K'])
          .optional()
          .describe('Output resolution (default: 2K)'),
        model: z
          .enum(['nano-banana-2', 'nano-banana-pro'])
          .optional()
          .describe('Image model: nano-banana-2 (fast) or nano-banana-pro (higher quality, default)'),
        useRecentChatImages: z
          .number()
          .int()
          .min(0)
          .max(4)
          .optional()
          .describe('Number of recent chat images to include as additional reference (0-4)'),
      })
    ),
    execute: async ({ userPrompt, goal, style, moduleSlugs, dynamics, focusArea, aspectRatio, imageSize, model, useRecentChatImages }) => {
      try {
        // Extract chat images if requested
        let chatReferenceImages: { base64: string; mimeType: string }[] | undefined;
        if (useRecentChatImages && useRecentChatImages > 0) {
          chatReferenceImages = extractRecentImages(messages, useRecentChatImages);
        }

        const result = await runChassisStudyPipeline({
          userPrompt,
          goal,
          style,
          moduleSlugs,
          dynamics,
          focusArea,
          aspectRatio,
          imageSize: imageSize as '1K' | '2K' | '4K' | undefined,
          model: model as 'nano-banana-2' | 'nano-banana-pro' | undefined,
          chatReferenceImages,
        });

        return {
          type: 'chassis_study_result' as const,
          success: true,
          studyId: result.study.id,
          studySlug: result.study.slug,
          imageUrl: result.imageUrl,
          brief: result.brief,
          generationPrompt: result.study.generation_prompt,
          moduleSlugs: result.study.module_slugs,
          referenceImageCount: result.study.reference_image_paths.length,
          durationMs: result.durationMs,
          metadata: result.study.generation_metadata,
        };
      } catch (err) {
        return {
          type: 'chassis_study_result' as const,
          success: false,
          error: err instanceof Error ? err.message : 'Chassis study failed',
        };
      }
    },
  });
}

/**
 * Tool for recording feedback on a chassis study result.
 */
export const recordStudyFeedback = tool({
  description:
    'Record satisfaction feedback on a chassis study result. Call this after showing the study image to the user and getting their reaction. ' +
    'Captures whether the goal was met, per-module fidelity assessment, and overall rating.',
  inputSchema: zodSchema(
    z.object({
      studyId: z.string().describe('UUID of the chassis study'),
      rating: z.number().int().min(1).max(5).describe('Overall satisfaction: 1 (poor) to 5 (excellent)'),
      goalMet: z.boolean().describe('Whether the image satisfies the stated study goal'),
      moduleFidelity: z
        .record(
          z.string(),
          z.object({
            accurate: z.boolean(),
            notes: z.string().optional(),
          })
        )
        .optional()
        .describe('Per-module fidelity assessment, keyed by module slug'),
      notes: z.string().optional().describe('Free-form notes about the result'),
      source: z
        .enum(['user', 'agent'])
        .optional()
        .describe('Who provided the feedback (default: agent)'),
    })
  ),
  execute: async ({ studyId, rating, goalMet, moduleFidelity, notes, source }) => {
    const { updateStudyServer } = await import('./luv-chassis-server');

    const feedback = {
      rating,
      goal_met: goalMet,
      module_fidelity: moduleFidelity ?? {},
      notes,
      source: source ?? 'agent',
      recorded_at: new Date().toISOString(),
    };

    const updated = await updateStudyServer(studyId, { feedback });

    return {
      recorded: true,
      studyId: updated.id,
      rating,
      goalMet,
    };
  },
});

/**
 * Tool for listing recent chassis studies.
 */
export const listChassisStudies = tool({
  description:
    'List recent chassis studies with their status, goals, and image URLs. Use to review past explorations or find studies to build on.',
  inputSchema: zodSchema(
    z.object({
      moduleSlugs: z
        .array(z.string())
        .optional()
        .describe('Filter by module slugs (returns studies involving any of these modules)'),
      limit: z.number().int().min(1).max(50).optional().describe('Max results (default: 10)'),
    })
  ),
  execute: async ({ moduleSlugs, limit }) => {
    const { getStudiesServer, getStudiesByModuleSlugsServer } = await import('./luv-chassis-server');

    const dbLimit = limit ?? 10;
    const studies = moduleSlugs && moduleSlugs.length > 0
      ? await getStudiesByModuleSlugsServer(moduleSlugs, dbLimit)
      : await getStudiesServer(dbLimit);

    return {
      studies: studies.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        status: s.status,
        goal: s.goal,
        style: s.style,
        moduleSlugs: s.module_slugs,
        imageUrl: s.generated_image_path ? resolveImagePublicUrl(s.generated_image_path) : null,
        feedback: s.feedback,
        created_at: s.created_at,
      })),
      total: studies.length,
    };
  },
});
