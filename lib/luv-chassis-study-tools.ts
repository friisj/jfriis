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
import { resolveReferenceImages, referenceImageSchema } from './luv-image-refs';

/**
 * Factory: create the run_chassis_study tool with access to current model messages.
 * This allows the tool to extract reference images from the conversation for i2i bolstering.
 */
export function createChassisStudyTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Run a chassis study — an EXPENSIVE multi-agent deliberation pipeline (~45s). ' +
      'ONLY use when the user explicitly asks to "study" chassis parameters or explore how specific modules manifest visually. ' +
      'Do NOT use for simple image requests like "generate a portrait" or "show me what you look like" — use generate_image instead. ' +
      'You and a Gemini director co-shape a brief from chassis parameters, then generate with canonical reference images. ' +
      'Required: userPrompt. Optional: moduleSlugs, style, dynamics, referenceImageIds, useRecentChatImages. ' +
      'Returns a public URL, Cog image ID, and the deliberation trace. Does NOT return the image itself.',
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
        ...referenceImageSchema,
      })
    ),
    execute: async ({ userPrompt, goal, style, moduleSlugs, dynamics, focusArea, aspectRatio, imageSize, model, useRecentChatImages, referenceImageIds }) => {
      try {
        // Resolve agent-provided references via unified resolver
        const { images: agentRefs } = await resolveReferenceImages(
          { fromChat: useRecentChatImages, fromCogIds: referenceImageIds },
          messages,
          4,
        );

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
          chatReferenceImages: agentRefs.length > 0 ? agentRefs : undefined,
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
          deliberation: {
            rounds: result.deliberation.turns.length,
            totalDurationMs: result.deliberation.totalDurationMs,
            summary: result.deliberation.turns.map((t) =>
              `[${t.role}] ${t.content.slice(0, 150)}${t.content.length > 150 ? '...' : ''}`
            ),
          },
          metadata: result.study.generation_metadata,
        };
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Chassis study failed';
        const detail = err instanceof Error
          ? err.stack?.split('\n').slice(0, 3).join('\n')
          : JSON.stringify(err, null, 2).slice(0, 300);
        console.error('[chassis-study] Tool execution failed:', message, detail);
        return {
          type: 'chassis_study_result' as const,
          success: false,
          error: message,
          errorDetail: detail,
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
