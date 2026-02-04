/**
 * Cog: Image Generation Pipeline
 * Database operations for series, images, jobs, and job steps
 */

import { supabase } from './supabase';
import { createClient } from './supabase-server';
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
  CogSeriesWithImages,
  CogSeriesWithJobs,
  CogJobWithSteps,
} from './types/cog';

// ============================================================================
// Series Operations
// ============================================================================

/**
 * Get all top-level series (no parent) - server-side
 */
export async function getSeriesServer(): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .is('parent_id', null)
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get all series (including nested) - server-side
 */
export async function getAllSeriesServer(): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get child series - server-side
 */
export async function getChildSeriesServer(parentId: string): Promise<CogSeries[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .eq('parent_id', parentId)
    .order('title', { ascending: true });

  if (error) throw error;
  return data as CogSeries[];
}

/**
 * Get a single series by ID - server-side
 */
export async function getSeriesByIdServer(id: string): Promise<CogSeries> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_series')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Get series with images - server-side
 */
export async function getSeriesWithImagesServer(id: string): Promise<CogSeriesWithImages> {
  const client = await createClient();

  const [seriesResult, imagesResult] = await Promise.all([
    (client as any).from('cog_series').select('*').eq('id', id).single(),
    (client as any).from('cog_images').select('*').eq('series_id', id).order('created_at', { ascending: false }),
  ]);

  if (seriesResult.error) throw seriesResult.error;
  if (imagesResult.error) throw imagesResult.error;

  return {
    ...seriesResult.data,
    images: imagesResult.data,
  } as CogSeriesWithImages;
}

/**
 * Get series with jobs - server-side
 */
export async function getSeriesWithJobsServer(id: string): Promise<CogSeriesWithJobs> {
  const client = await createClient();

  const [seriesResult, jobsResult] = await Promise.all([
    (client as any).from('cog_series').select('*').eq('id', id).single(),
    (client as any).from('cog_jobs').select('*').eq('series_id', id).order('created_at', { ascending: false }),
  ]);

  if (seriesResult.error) throw seriesResult.error;
  if (jobsResult.error) throw jobsResult.error;

  return {
    ...seriesResult.data,
    jobs: jobsResult.data,
  } as CogSeriesWithJobs;
}

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
// Image Operations
// ============================================================================

/**
 * Get images for a series - server-side
 */
export async function getSeriesImagesServer(seriesId: string): Promise<CogImage[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogImage[];
}

/**
 * Get a single image by ID - server-side
 */
export async function getImageByIdServer(id: string): Promise<CogImage> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_images')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogImage;
}

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
// Job Operations
// ============================================================================

/**
 * Get jobs for a series - server-side
 */
export async function getSeriesJobsServer(seriesId: string): Promise<CogJob[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogJob[];
}

/**
 * Get a single job by ID - server-side
 */
export async function getJobByIdServer(id: string): Promise<CogJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogJob;
}

/**
 * Get job with steps - server-side
 */
export async function getJobWithStepsServer(id: string): Promise<CogJobWithSteps> {
  const client = await createClient();

  const [jobResult, stepsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_job_steps').select('*').eq('job_id', id).order('sequence', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;

  return {
    ...jobResult.data,
    steps: stepsResult.data,
  } as CogJobWithSteps;
}

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

// ============================================================================
// Job Step Operations
// ============================================================================

/**
 * Get steps for a job - server-side
 */
export async function getJobStepsServer(jobId: string): Promise<CogJobStep[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_job_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('sequence', { ascending: true });

  if (error) throw error;
  return data as CogJobStep[];
}

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
