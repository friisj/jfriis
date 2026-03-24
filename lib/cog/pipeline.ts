/**
 * Cog: Pipeline operations, base candidates, reset — Client-side operations
 */

import { supabase } from '../supabase';
import type {
  CogJob,
  CogPipelineStep,
  CogPipelineStepInsert,
  CogPipelineStepOutput,
  CogPipelineStepOutputInsert,
  CogPipelineBaseCandidate,
  InferenceStepConfigs,
  ReferenceImageConfigs,
} from '../types/cog';

// ============================================================================
// Pipeline Job Operations (Client)
// ============================================================================

/**
 * Create a pipeline job with steps - client-side
 */
export async function createPipelineJob(input: {
  series_id: string;
  title: string | null;
  initial_images: string[] | null;
  base_prompt: string;
  negative_prompt?: string | null;
  include_negative_prompt?: boolean;
  // Pipeline config references
  photographer_config_id?: string | null;
  director_config_id?: string | null;
  production_config_id?: string | null;
  // Inference execution controls
  inference_model?: string | null;
  use_thinking_infer4?: boolean;
  use_thinking_infer6?: boolean;
  max_reference_images?: number;
  // Two-phase execution controls
  num_base_images?: number;
  foundation_model?: string;
  aspect_ratio?: string;
  // Inference input arrays
  colors?: string[] | null;
  themes?: string[] | null;
  // Per-step inference overrides
  inference_step_configs?: InferenceStepConfigs | null;
  // Per-image routing
  reference_image_configs?: ReferenceImageConfigs | null;
  steps?: CogPipelineStepInsert[];
}): Promise<{ job: CogJob; steps: CogPipelineStep[] }> {
  // Create the job first
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title,
      base_prompt: input.base_prompt,
      negative_prompt: input.negative_prompt || null,
      include_negative_prompt: input.include_negative_prompt ?? true,
      job_type: 'pipeline',
      initial_images: input.initial_images,
      status: 'draft',
      image_model: 'auto', // Default values for required fields
      image_size: '2K',
      aspect_ratio: input.aspect_ratio || '1:1',
      use_thinking: false,
      // Pipeline config references
      photographer_config_id: input.photographer_config_id || null,
      director_config_id: input.director_config_id || null,
      production_config_id: input.production_config_id || null,
      // Inference execution controls
      inference_model: input.inference_model || null,
      use_thinking_infer4: input.use_thinking_infer4 ?? true,
      use_thinking_infer6: input.use_thinking_infer6 ?? true,
      max_reference_images: input.max_reference_images ?? 3,
      // Two-phase execution controls
      num_base_images: input.num_base_images ?? 3,
      foundation_model: input.foundation_model || 'gemini-3-pro-image',
      // Inference input arrays
      colors: input.colors || null,
      themes: input.themes || null,
      // Per-step inference overrides
      inference_step_configs: input.inference_step_configs || null,
      // Per-image routing
      reference_image_configs: input.reference_image_configs || null,
    })
    .select()
    .single();

  if (jobError) throw jobError;

  // Create the steps (if provided)
  if (input.steps && input.steps.length > 0) {
    const stepsToInsert = input.steps.map((step) => ({
      job_id: job.id,
      step_order: step.step_order,
      step_type: step.step_type,
      model: step.model,
      config: step.config,
      status: step.status || 'pending',
    }));

    const { data: steps, error: stepsError } = await (supabase as any)
      .from('cog_pipeline_steps')
      .insert(stepsToInsert)
      .select();

    if (stepsError) throw stepsError;

    return { job: job as CogJob, steps: steps as CogPipelineStep[] };
  }

  return { job: job as CogJob, steps: [] };
}

/**
 * Replace all pipeline steps on a job (delete existing + outputs, insert new).
 * Only allowed when the sequence is not currently running.
 */
export async function savePipelineSteps(
  jobId: string,
  steps: Array<Omit<CogPipelineStepInsert, 'job_id'>>
): Promise<CogPipelineStep[]> {
  // Delete existing step outputs first
  const { data: existingSteps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (existingSteps && existingSteps.length > 0) {
    const stepIds = existingSteps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }

  // Delete existing steps
  await (supabase as any)
    .from('cog_pipeline_steps')
    .delete()
    .eq('job_id', jobId);

  // Insert new steps
  if (steps.length === 0) return [];

  const stepsToInsert = steps.map((step, idx) => ({
    job_id: jobId,
    step_order: idx,
    step_type: step.step_type,
    model: step.model,
    config: step.config,
    status: 'pending',
  }));

  const { data: newSteps, error } = await (supabase as any)
    .from('cog_pipeline_steps')
    .insert(stepsToInsert)
    .select();

  if (error) throw error;
  return newSteps as CogPipelineStep[];
}

/**
 * Update pipeline job configuration fields. Only works on draft jobs.
 */
export async function updatePipelineJob(jobId: string, input: {
  title?: string | null;
  base_prompt?: string;
  negative_prompt?: string | null;
  include_negative_prompt?: boolean;
  initial_images?: string[] | null;
  photographer_config_id?: string | null;
  director_config_id?: string | null;
  production_config_id?: string | null;
  colors?: string[] | null;
  themes?: string[] | null;
  num_base_images?: number;
  foundation_model?: string;
  aspect_ratio?: string;
  inference_step_configs?: InferenceStepConfigs | null;
  reference_image_configs?: ReferenceImageConfigs | null;
}): Promise<CogJob> {
  const { data: job, error } = await (supabase as any)
    .from('cog_jobs')
    .update(input)
    .eq('id', jobId)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) throw error;
  return job as CogJob;
}

/**
 * Create a pipeline step output - client-side
 */
export async function createPipelineStepOutput(input: CogPipelineStepOutputInsert): Promise<CogPipelineStepOutput> {
  const { data, error } = await (supabase as any)
    .from('cog_pipeline_step_outputs')
    .insert({
      step_id: input.step_id,
      image_id: input.image_id,
      metadata: input.metadata || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineStepOutput;
}

// ============================================================================
// Base Candidate Operations (Client)
// ============================================================================

/**
 * Create a base candidate record - client-side
 */
export async function createBaseCandidate(input: {
  job_id: string;
  image_id: string;
  candidate_index: number;
}): Promise<CogPipelineBaseCandidate> {
  const { data, error } = await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineBaseCandidate;
}

/**
 * Get base candidates for a pipeline job - client-side
 */
export async function getBaseCandidatesForJob(jobId: string): Promise<CogPipelineBaseCandidate[]> {
  const { data, error } = await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('candidate_index', { ascending: true });

  if (error) throw error;
  return data as CogPipelineBaseCandidate[];
}

/**
 * Select a base image for a pipeline job - client-side
 * Stores the user's choice in cog_jobs.selected_base_image_id
 */
export async function selectBaseImage(jobId: string, imageId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_jobs')
    .update({ selected_base_image_id: imageId })
    .eq('id', jobId);

  if (error) throw error;
}

/**
 * Reset a pipeline job back to draft state - client-side
 * Clears all progress: resets statuses, deletes outputs, candidates
 */
export async function resetPipelineJobToDraft(jobId: string): Promise<CogJob> {
  // Reset job statuses
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .update({
      status: 'draft',
      foundation_status: 'pending',
      sequence_status: 'pending',
      selected_base_image_id: null,
      synthesized_prompt: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', jobId)
    .select()
    .single();

  if (jobError) throw jobError;

  // Reset all pipeline steps
  const { error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .update({
      status: 'pending',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', jobId);

  if (stepsError) throw stepsError;

  // Delete step outputs
  const { data: steps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (steps && steps.length > 0) {
    const stepIds = steps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }

  // Delete base candidates
  await (supabase as any)
    .from('cog_pipeline_base_candidates')
    .delete()
    .eq('job_id', jobId);

  return job as CogJob;
}

/**
 * Reset pipeline steps to pending state - client-side
 * Used when changing base selection to re-run sequence
 */
export async function resetPipelineSteps(jobId: string): Promise<void> {
  // Reset step statuses
  const { error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .update({
      status: 'pending',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', jobId);

  if (stepsError) throw stepsError;

  // Delete step outputs
  const { data: steps } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('id')
    .eq('job_id', jobId);

  if (steps && steps.length > 0) {
    const stepIds = steps.map((s: { id: string }) => s.id);
    await (supabase as any)
      .from('cog_pipeline_step_outputs')
      .delete()
      .in('step_id', stepIds);
  }
}

/**
 * Duplicate a pipeline job - creates a copy with same config but fresh state
 */
export async function duplicatePipelineJob(jobId: string): Promise<CogJob> {
  // Fetch original job
  const { data: originalJob, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError) throw jobError;

  // Fetch original pipeline steps
  const { data: originalSteps, error: stepsError } = await (supabase as any)
    .from('cog_pipeline_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('step_order', { ascending: true });

  if (stepsError) throw stepsError;

  // Create new job (copy pipeline-specific fields, reset status)
  const { data: newJob, error: createError } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: originalJob.series_id,
      title: originalJob.title ? `${originalJob.title} (copy)` : null,
      base_prompt: originalJob.base_prompt,
      negative_prompt: originalJob.negative_prompt || null,
      include_negative_prompt: originalJob.include_negative_prompt ?? true,
      job_type: 'pipeline',
      initial_images: originalJob.initial_images,
      photographer_config_id: originalJob.photographer_config_id,
      director_config_id: originalJob.director_config_id,
      production_config_id: originalJob.production_config_id,
      inference_model: originalJob.inference_model,
      use_thinking_infer4: originalJob.use_thinking_infer4,
      use_thinking_infer6: originalJob.use_thinking_infer6,
      max_reference_images: originalJob.max_reference_images,
      num_base_images: originalJob.num_base_images,
      foundation_model: originalJob.foundation_model || 'gemini-3-pro-image',
      colors: originalJob.colors,
      themes: originalJob.themes,
      inference_step_configs: originalJob.inference_step_configs || null,
      reference_image_configs: originalJob.reference_image_configs || null,
      image_model: 'auto',
      image_size: '2K',
      aspect_ratio: originalJob.aspect_ratio || '1:1',
      use_thinking: false,
      status: 'draft',
    })
    .select()
    .single();

  if (createError) throw createError;

  // Copy steps (reset statuses)
  if (originalSteps && originalSteps.length > 0) {
    const newSteps = originalSteps.map((step: CogPipelineStep) => ({
      job_id: newJob.id,
      step_order: step.step_order,
      step_type: step.step_type,
      model: step.model,
      config: step.config,
      status: 'pending',
    }));

    const { error: createStepsError } = await (supabase as any)
      .from('cog_pipeline_steps')
      .insert(newSteps);

    if (createStepsError) throw createStepsError;
  }

  return newJob as CogJob;
}
