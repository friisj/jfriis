/**
 * Luv: Video Generation Tool Definitions
 *
 * Two-tool async pattern — mirrors the generate_image tool but for video:
 *
 *   start_video_generation — submits a job, returns a jobId UUID
 *   check_video_generation — polls the job; returns status and URL when done
 *
 * The agent calls start_video_generation once, then check_video_generation
 * every turn until status is 'completed' or 'failed'. Both providers (Veo,
 * Grok) support image-to-video (i2v) via the same referenceImageSchema used
 * by generate_image.
 *
 * i2v: pass one reference image via referenceImageIds or useRecentChatImages.
 * Only the first resolved image is used as the first-frame conditioning input.
 */

import { tool, zodSchema } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { submitVideoJob, checkVideoJob } from './luv-video-gen';
import { resolveReferenceImages, referenceImageSchema } from './luv-image-refs';

// Shared aspect ratio schema — Veo supports 16:9 and 9:16 only;
// Grok supports more but we expose the common intersection.
const videoAspectRatioSchema = z
  .enum(['16:9', '9:16'])
  .optional()
  .describe('Aspect ratio (default: 16:9). 16:9 = landscape, 9:16 = portrait/vertical.');

/**
 * Factory: create the start_video_generation tool with access to current model
 * messages so it can extract reference images from the conversation for i2v.
 */
export function createStartVideoGenerationTool(messages: ModelMessage[]) {
  return tool({
    description:
      'Submit a video generation job. Returns a jobId — use check_video_generation to poll for completion. ' +
      'Choose provider: "veo" for high-quality cinematic output (5/6/8s durations), ' +
      '"grok" for flexible duration (1–15s) and fast turnaround. ' +
      'For image-to-video (i2v), pass one reference image via referenceImageIds or useRecentChatImages — ' +
      'it becomes the first-frame conditioning input. ' +
      'DO NOT describe the video in your response before calling this tool — call the tool first.',
    inputSchema: zodSchema(
      z.object({
        prompt: z
          .string()
          .describe(
            'Detailed video generation prompt. Describe subject, motion, camera movement, lighting, style, and mood.',
          ),
        provider: z
          .enum(['veo', 'grok'])
          .describe(
            'Provider: "veo" (Gemini — higher quality, 5/6/8s) or ' +
              '"grok" (xAI — flexible 1–15s duration, 720p max, fast).',
          ),
        ...referenceImageSchema,
        aspectRatio: videoAspectRatioSchema,
        durationSeconds: z
          .number()
          .optional()
          .describe(
            'Duration in seconds. Veo accepts 5, 6, or 8 (default 8). ' +
              'Grok accepts 1–15 (default 5). i2v with Veo requires 8s.',
          ),
        resolution: z
          .enum(['720p', '1080p', '4K'])
          .optional()
          .describe(
            'Output resolution (default: 720p). Grok max is 720p.',
          ),
        veoModel: z
          .enum(['veo-3.1', 'veo-3.1-fast'])
          .optional()
          .describe('Veo model version (default: veo-3.1). "veo-3.1-fast" is faster but lower quality.'),
      }),
    ),
    execute: async ({
      prompt,
      provider,
      useRecentChatImages,
      referenceImageIds,
      aspectRatio,
      durationSeconds,
      resolution,
      veoModel,
    }) => {
      try {
        // Resolve reference images — for video we use only the first one (i2v)
        const { images: refs, warnings: refWarnings } = await resolveReferenceImages(
          { fromChat: useRecentChatImages, fromCogIds: referenceImageIds },
          messages,
          1, // max 1 for video — first frame only
        );

        const jobId = await submitVideoJob({
          provider,
          prompt,
          referenceImage: refs[0],
          aspectRatio: aspectRatio as '16:9' | '9:16' | undefined,
          durationSeconds,
          resolution: resolution as '720p' | '1080p' | '4K' | undefined,
          veoModel: veoModel as 'veo-3.1' | 'veo-3.1-fast' | undefined,
        });

        return {
          type: 'video_job_started' as const,
          success: true,
          jobId,
          provider,
          prompt,
          referenceImageCount: refs.length,
          message:
            `Video generation job submitted (${provider}). ` +
            `Call check_video_generation with jobId "${jobId}" to check status. ` +
            `Typical wait: ${provider === 'veo' ? '30–90s' : '15–60s'}.`,
          ...(refWarnings.length > 0 ? { warnings: refWarnings } : {}),
        };
      } catch (err) {
        return {
          type: 'video_job_started' as const,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to submit video job',
        };
      }
    },
  });
}

/**
 * Poll a previously submitted video job for completion.
 * Auto-polls with backoff (up to ~90s) so the agent doesn't need to call repeatedly.
 * On success returns a public Supabase URL for the stored video.
 */
export const checkVideoGeneration = tool({
  description:
    'Check the status of a video generation job. ' +
    'This tool auto-polls with backoff — it will wait up to ~90 seconds for completion. ' +
    'Returns status: "completed" | "failed" | "timeout". ' +
    'On "completed", returns videoUrl — a public URL for the stored video. ' +
    'On "timeout", call again later — the job is still running. ' +
    'You only need to call this ONCE after start_video_generation.',
  inputSchema: zodSchema(
    z.object({
      jobId: z.string().uuid().describe('The jobId UUID returned by start_video_generation.'),
    }),
  ),
  execute: async ({ jobId }) => {
    // Auto-poll with backoff: 5s, 5s, 10s, 10s, 15s, 15s, 15s, 15s = ~90s total
    const intervals = [5000, 5000, 10000, 10000, 15000, 15000, 15000, 15000];

    try {
      for (let attempt = 0; attempt <= intervals.length; attempt++) {
        const job = await checkVideoJob(jobId);

        if (job.status === 'completed' && job.storageUrl) {
          return {
            type: 'video_job_result' as const,
            success: true,
            jobId: job.id,
            status: 'completed',
            videoUrl: job.storageUrl,
            provider: job.provider,
            durationMs: job.durationMs,
            message: 'Video generation complete.',
          };
        }

        if (job.status === 'failed') {
          return {
            type: 'video_job_result' as const,
            success: false,
            jobId: job.id,
            status: 'failed',
            error: job.errorMessage ?? 'Video generation failed',
          };
        }

        // Still in flight — wait before next poll (unless we've exhausted retries)
        if (attempt < intervals.length) {
          await new Promise(resolve => setTimeout(resolve, intervals[attempt]));
        }
      }

      // Timed out — still processing
      return {
        type: 'video_job_result' as const,
        success: true,
        jobId,
        status: 'timeout',
        message: 'Video is still generating after ~90s. Call check_video_generation again later.',
      };
    } catch (err) {
      return {
        type: 'video_job_result' as const,
        success: false,
        status: 'failed',
        error: err instanceof Error ? err.message : 'Failed to check video job',
      };
    }
  },
});
