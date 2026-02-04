/**
 * Cog: Image Generation Pipeline - Server-side operations
 * These functions use the server-side Supabase client and can only be used in Server Components
 */

import { createClient } from './supabase-server';
import type {
  CogSeries,
  CogImage,
  CogJob,
  CogJobStep,
  CogSeriesWithImages,
  CogSeriesWithJobs,
  CogJobWithSteps,
} from './types/cog';

// ============================================================================
// Series Operations (Server)
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

// ============================================================================
// Image Operations (Server)
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

// ============================================================================
// Job Operations (Server)
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

// ============================================================================
// Job Step Operations (Server)
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
