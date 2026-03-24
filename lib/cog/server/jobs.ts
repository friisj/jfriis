import { createClient } from '../../supabase-server';
import type {
  CogJob,
  CogJobUpdate,
  CogJobStep,
  CogJobWithSteps,
  CogJobWithStepsAndInputs,
  CogJobInputWithImage,
  CogSeriesWithJobs,
} from '../../types/cog';

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
 * Get job with steps and inputs (including images) - server-side
 */
export async function getJobWithStepsAndInputsServer(id: string): Promise<CogJobWithStepsAndInputs> {
  const client = await createClient();

  const [jobResult, stepsResult, inputsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_job_steps').select('*').eq('job_id', id).order('sequence', { ascending: true }),
    (client as any).from('cog_job_inputs').select('*, image:cog_images(*)').eq('job_id', id).order('reference_id', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;
  if (inputsResult.error) throw inputsResult.error;

  return {
    ...jobResult.data,
    steps: stepsResult.data,
    inputs: inputsResult.data as CogJobInputWithImage[],
  } as CogJobWithStepsAndInputs;
}

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
 * Update a job - server-side (for use in server actions)
 */
export async function updateJobServer(id: string, updates: CogJobUpdate): Promise<CogJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogJob;
}
