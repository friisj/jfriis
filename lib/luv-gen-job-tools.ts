/**
 * Luv: Generation Job Check Tool
 *
 * Shared tool for checking the status of any generation job (image, chassis study, sketch study).
 * If the job is pending, executes the pipeline inline and returns the result.
 */

import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { getGenJob, executeGenJob } from './luv-gen-jobs';

/**
 * Generic checker for all generation job types.
 * If pending → executes the pipeline inline, updates the row, returns result.
 * If completed/failed → returns immediately.
 */
export const checkGenJob = tool({
  description:
    'Check the status of a generation job (image, chassis study, or sketch study). ' +
    'If the job is still pending, this tool will execute it and return the result — this may take 10-60 seconds. ' +
    'Call this after start_image_generation, start_chassis_study, or start_sketch_study. ' +
    'Returns the full result including imageUrl on success.',
  inputSchema: zodSchema(
    z.object({
      jobId: z.string().uuid().describe('The jobId UUID returned by a start_* tool.'),
    }),
  ),
  execute: async ({ jobId }) => {
    try {
      const existing = await getGenJob(jobId);
      if (!existing) {
        return {
          type: 'gen_job_result' as const,
          success: false,
          error: `Job not found: ${jobId}`,
        };
      }

      // Already terminal — return immediately
      if (existing.status === 'completed' && existing.result_data) {
        return {
          type: 'gen_job_result' as const,
          success: true,
          jobId: existing.id,
          jobType: existing.job_type,
          status: 'completed',
          ...existing.result_data,
          durationMs: existing.duration_ms,
        };
      }

      if (existing.status === 'failed') {
        return {
          type: 'gen_job_result' as const,
          success: false,
          jobId: existing.id,
          jobType: existing.job_type,
          status: 'failed',
          error: existing.error_message ?? 'Generation failed',
        };
      }

      // Pending or processing — execute the pipeline
      const result = await executeGenJob(jobId);

      if (result.status === 'completed' && result.result_data) {
        return {
          type: 'gen_job_result' as const,
          success: true,
          jobId: result.id,
          jobType: result.job_type,
          status: 'completed',
          ...result.result_data,
          durationMs: result.duration_ms,
        };
      }

      return {
        type: 'gen_job_result' as const,
        success: false,
        jobId: result.id,
        jobType: result.job_type,
        status: 'failed',
        error: result.error_message ?? 'Generation failed',
      };
    } catch (err) {
      return {
        type: 'gen_job_result' as const,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check generation job',
      };
    }
  },
});
