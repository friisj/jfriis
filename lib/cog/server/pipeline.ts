import { createClient } from '../../supabase-server';
import type {
  CogJob,
  CogPipelineStep,
  CogPipelineStepOutput,
  CogPipelineStepOutputInsert,
  CogPipelineJobWithSteps,
  CogPipelineBaseCandidate,
} from '../../types/cog';
import {
  getPhotographerConfigByIdServer,
  getDirectorConfigByIdServer,
  getProductionConfigByIdServer,
} from './configs';

/**
 * Get pipeline steps for a job - server-side
 */
export async function getPipelineStepsServer(jobId: string): Promise<CogPipelineStep[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('step_order', { ascending: true });

  if (error) throw error;
  return data as CogPipelineStep[];
}

/**
 * Get pipeline job with steps and configs - server-side
 */
export async function getPipelineJobWithStepsServer(jobId: string): Promise<CogPipelineJobWithSteps> {
  const client = await createClient();

  const [jobResult, stepsResult] = await Promise.all([
    (client as any).from('cog_jobs').select('*').eq('id', jobId).single(),
    (client as any)
      .from('cog_pipeline_steps')
      .select('*, outputs:cog_pipeline_step_outputs(*)')
      .eq('job_id', jobId)
      .order('step_order', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (stepsResult.error) throw stepsResult.error;

  const job = jobResult.data as CogJob;

  // Fetch pipeline configs if present
  const [photographerConfig, directorConfig, productionConfig] = await Promise.all([
    job.photographer_config_id
      ? getPhotographerConfigByIdServer(job.photographer_config_id).catch(() => null)
      : null,
    job.director_config_id
      ? getDirectorConfigByIdServer(job.director_config_id).catch(() => null)
      : null,
    job.production_config_id
      ? getProductionConfigByIdServer(job.production_config_id).catch(() => null)
      : null,
  ]);

  // Process steps with their outputs
  const steps = stepsResult.data.map((step: any) => ({
    ...step,
    output: step.outputs && step.outputs.length > 0 ? step.outputs[0] : null,
  }));

  return {
    ...job,
    steps,
    photographer_config: photographerConfig,
    director_config: directorConfig,
    production_config: productionConfig,
  } as CogPipelineJobWithSteps;
}

/**
 * Get base candidates for a pipeline job - server-side
 */
export async function getBaseCandidatesForJobServer(jobId: string): Promise<CogPipelineBaseCandidate[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_base_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('candidate_index', { ascending: true });

  if (error) throw error;
  return data as CogPipelineBaseCandidate[];
}

/**
 * Create a pipeline step output - server-side (for use in server actions)
 */
export async function createPipelineStepOutputServer(input: CogPipelineStepOutputInsert): Promise<CogPipelineStepOutput> {
  const client = await createClient();
  const { data, error } = await (client as any)
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

/**
 * Create a base candidate - server-side (for use in server actions)
 */
export async function createBaseCandidateServer(input: {
  job_id: string;
  image_id: string;
  candidate_index: number;
}): Promise<CogPipelineBaseCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_pipeline_base_candidates')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogPipelineBaseCandidate;
}
