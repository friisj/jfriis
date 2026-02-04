/**
 * Cog: Image Generation Pipeline - Client-side operations
 * These functions use the browser-side Supabase client and can be used in Client Components
 */

import { supabase } from './supabase';
import type {
  CogSeries,
  CogSeriesInsert,
  CogSeriesUpdate,
  CogImage,
  CogImageInsert,
  CogImageUpdate,
  CogJob,
  CogJobInsert,
  CogJobUpdate,
  CogJobStep,
  CogJobStepInsert,
  CogJobStepUpdate,
  CogJobInput,
  CogJobInputInsert,
} from './types/cog';

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Get the public URL for a cog image stored in Supabase
 */
export function getCogImageUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/cog-images/${storagePath}`;
}

// ============================================================================
// Series Operations (Client)
// ============================================================================

/**
 * Create a new series - client-side
 */
export async function createSeries(input: CogSeriesInsert): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .insert({
      parent_id: input.parent_id || null,
      title: input.title,
      description: input.description || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Update a series - client-side
 */
export async function updateSeries(id: string, updates: CogSeriesUpdate): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Delete a series - client-side
 */
export async function deleteSeries(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_series')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Image Operations (Client)
// ============================================================================

/**
 * Create an image record - client-side
 */
export async function createImage(input: CogImageInsert): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .insert({
      series_id: input.series_id,
      job_id: input.job_id || null,
      storage_path: input.storage_path,
      filename: input.filename,
      mime_type: input.mime_type || 'image/png',
      width: input.width || null,
      height: input.height || null,
      file_size: input.file_size || null,
      source: input.source,
      prompt: input.prompt || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Update an image - client-side
 */
export async function updateImage(id: string, updates: CogImageUpdate): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Delete an image - client-side
 */
export async function deleteImage(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Job Operations (Client)
// ============================================================================

/**
 * Create a job - client-side
 */
export async function createJob(input: CogJobInsert): Promise<CogJob> {
  const { data, error } = await (supabase as any)
    .from('cog_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title || null,
      base_prompt: input.base_prompt,
      negative_prompt: input.negative_prompt || null,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Update a job - client-side
 */
export async function updateJob(id: string, updates: CogJobUpdate): Promise<CogJob> {
  const { data, error } = await (supabase as any)
    .from('cog_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Delete a job - client-side
 */
export async function deleteJob(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Retry a failed job - resets job and all steps to pending state
 */
export async function retryJob(id: string): Promise<CogJob> {
  // Reset the job status
  const { data: job, error: jobError } = await (supabase as any)
    .from('cog_jobs')
    .update({
      status: 'ready',
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (jobError) throw jobError;

  // Reset all steps to pending
  const { error: stepsError } = await (supabase as any)
    .from('cog_job_steps')
    .update({
      status: 'pending',
      output: null,
      error_message: null,
      started_at: null,
      completed_at: null,
    })
    .eq('job_id', id);

  if (stepsError) throw stepsError;

  return job as CogJob;
}

// ============================================================================
// Job Step Operations (Client)
// ============================================================================

/**
 * Create a job step - client-side
 */
export async function createJobStep(input: CogJobStepInsert): Promise<CogJobStep> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .insert({
      job_id: input.job_id,
      sequence: input.sequence,
      step_type: input.step_type,
      model: input.model,
      prompt: input.prompt,
      context: input.context || {},
      status: input.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJobStep;
}

/**
 * Update a job step - client-side
 */
export async function updateJobStep(id: string, updates: CogJobStepUpdate): Promise<CogJobStep> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJobStep;
}

/**
 * Delete a job step - client-side
 */
export async function deleteJobStep(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_job_steps')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Batch create job steps - client-side
 */
export async function createJobSteps(steps: CogJobStepInsert[]): Promise<CogJobStep[]> {
  const { data, error } = await (supabase as any)
    .from('cog_job_steps')
    .insert(steps.map(step => ({
      job_id: step.job_id,
      sequence: step.sequence,
      step_type: step.step_type,
      model: step.model,
      prompt: step.prompt,
      context: step.context || {},
      status: step.status || 'pending',
    })))
    .select();

  if (error) throw error;
  return data as CogJobStep[];
}

// ============================================================================
// Job Input Operations (Client)
// ============================================================================

/**
 * Create a job input - client-side
 */
export async function createJobInput(input: CogJobInputInsert): Promise<CogJobInput> {
  const { data, error } = await (supabase as any)
    .from('cog_job_inputs')
    .insert({
      job_id: input.job_id,
      image_id: input.image_id,
      reference_id: input.reference_id,
      context: input.context || null,
      negative_prompt: input.negative_prompt || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogJobInput;
}

/**
 * Batch create job inputs - client-side
 */
export async function createJobInputs(inputs: CogJobInputInsert[]): Promise<CogJobInput[]> {
  if (inputs.length === 0) return [];

  const { data, error } = await (supabase as any)
    .from('cog_job_inputs')
    .insert(inputs.map(input => ({
      job_id: input.job_id,
      image_id: input.image_id,
      reference_id: input.reference_id,
      context: input.context || null,
      negative_prompt: input.negative_prompt || null,
    })))
    .select();

  if (error) throw error;
  return data as CogJobInput[];
}

/**
 * Delete a job input - client-side
 */
export async function deleteJobInput(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_job_inputs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
