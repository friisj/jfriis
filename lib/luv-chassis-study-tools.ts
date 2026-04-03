/**
 * Luv: Chassis Study Tool Definitions
 *
 * Two-phase async pattern:
 *   start_chassis_study — resolves refs, creates job row, returns jobId
 *   check_gen_job (shared) — executes the pipeline if pending, returns result
 */

import { tool, zodSchema } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { resolveImagePublicUrl } from './luv-image-utils';
import { resolveReferenceImages, referenceImageSchema } from './luv-image-refs';
import { submitGenJob } from './luv-gen-jobs';

/**
 * Factory: create the start_chassis_study tool.
 * Resolves reference images, creates a gen job row, returns jobId immediately.
 */
export function createStartChassisStudyTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Start a chassis study — a multi-agent deliberation pipeline. Returns a jobId — ' +
      'call check_gen_job with the jobId to get the result (takes ~45 seconds). ' +
      'ONLY use when the user explicitly asks to "study" chassis parameters or explore how specific modules manifest visually. ' +
      'Do NOT use for simple image requests — use start_image_generation instead. ' +
      'You can start multiple studies in one step, then check them all with separate check_gen_job calls.',
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
        const { images: agentRefs, warnings: refWarnings } = await resolveReferenceImages(
          { fromChat: useRecentChatImages, fromCogIds: referenceImageIds },
          messages,
          4,
        );

        const jobId = await submitGenJob('chassis_study', {
          userPrompt,
          goal,
          style,
          moduleSlugs,
          dynamics,
          focusArea,
          aspectRatio,
          imageSize,
          model,
          chatReferenceImages: agentRefs.length > 0 ? agentRefs : undefined,
        });

        return {
          type: 'gen_job_started' as const,
          success: true,
          jobId,
          jobType: 'chassis_study',
          message: `Chassis study started. Call check_gen_job with jobId "${jobId}" to get the result (~45s).`,
          referenceImageCount: agentRefs.length,
          ...(refWarnings.length > 0 ? { warnings: refWarnings } : {}),
        };
      } catch (err) {
        return {
          type: 'gen_job_started' as const,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to start chassis study',
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
