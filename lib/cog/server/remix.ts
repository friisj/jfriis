import { createClient } from '../../supabase-server';
import type {
  CogRemixJob,
  CogRemixJobFull,
  CogRemixJobUpdate,
  CogRemixSearchIteration,
  CogRemixCandidate,
  CogRemixAugmentStep,
  CogRemixTraceEntry,
  CogEvalProfile,
  CogRemixEvalRunFull,
} from '../../types/cog';
import { getEvalProfileByIdServer, getEvalProfilesByIdsServer, getRemixEvalRunsForJobServer } from './eval';

/**
 * Get a single remix job by ID - server-side
 */
export async function getRemixJobByIdServer(id: string): Promise<CogRemixJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Get a full remix job with iterations, candidates, augment steps, eval profile, and eval runs - server-side
 */
export async function getRemixJobFullServer(id: string): Promise<CogRemixJobFull> {
  const client = await createClient();

  const [jobResult, iterationsResult, candidatesResult, augmentResult] = await Promise.all([
    (client as any).from('cog_remix_jobs').select('*').eq('id', id).single(),
    (client as any).from('cog_remix_search_iterations').select('*').eq('job_id', id).order('iteration_number', { ascending: true }),
    (client as any).from('cog_remix_candidates').select('*').eq('job_id', id).order('created_at', { ascending: true }),
    (client as any).from('cog_remix_augment_steps').select('*').eq('job_id', id).order('step_order', { ascending: true }),
  ]);

  if (jobResult.error) throw jobResult.error;
  if (iterationsResult.error) throw iterationsResult.error;
  if (candidatesResult.error) throw candidatesResult.error;
  if (augmentResult.error) throw augmentResult.error;

  const job = jobResult.data as CogRemixJob;

  // Fetch eval profiles (array), legacy single profile, and eval runs
  const [evalProfiles, evalProfile, evalRuns] = await Promise.all([
    (job.eval_profile_ids && job.eval_profile_ids.length > 0)
      ? getEvalProfilesByIdsServer(job.eval_profile_ids).catch(() => [] as CogEvalProfile[])
      : Promise.resolve([] as CogEvalProfile[]),
    job.eval_profile_id
      ? getEvalProfileByIdServer(job.eval_profile_id).catch(() => null)
      : null,
    getRemixEvalRunsForJobServer(id).catch(() => [] as CogRemixEvalRunFull[]),
  ]);

  const iterations = (iterationsResult.data as CogRemixSearchIteration[]).map((iter) => ({
    ...iter,
    candidates: (candidatesResult.data as CogRemixCandidate[]).filter((c) => c.iteration_id === iter.id),
  }));

  return {
    ...job,
    iterations,
    augment_steps: augmentResult.data as CogRemixAugmentStep[],
    eval_profile: evalProfiles.length > 0 ? evalProfiles[0] : evalProfile,
    eval_profiles: evalProfiles,
    eval_runs: evalRuns,
  } as CogRemixJobFull;
}

/**
 * Get remix jobs for a series - server-side
 */
export async function getRemixJobsForSeriesServer(seriesId: string): Promise<CogRemixJob[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogRemixJob[];
}

/**
 * Update a remix job - server-side
 */
export async function updateRemixJobServer(id: string, updates: CogRemixJobUpdate): Promise<CogRemixJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Create a search iteration record - server-side
 */
export async function createRemixSearchIterationServer(input: {
  job_id: string;
  iteration_number: number;
  search_params: Record<string, unknown>;
  llm_reasoning?: string;
  status?: string;
}): Promise<CogRemixSearchIteration> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_search_iterations')
    .insert({
      job_id: input.job_id,
      iteration_number: input.iteration_number,
      search_params: input.search_params,
      llm_reasoning: input.llm_reasoning || null,
      status: input.status || 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixSearchIteration;
}

/**
 * Update a search iteration - server-side
 */
export async function updateRemixSearchIterationServer(
  id: string,
  updates: Partial<CogRemixSearchIteration>
): Promise<CogRemixSearchIteration> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_search_iterations')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixSearchIteration;
}

/**
 * Create a remix candidate record - server-side
 */
export async function createRemixCandidateServer(input: {
  job_id: string;
  iteration_id: string;
  source: string;
  source_id: string;
  source_url: string;
  thumbnail_url: string;
  photographer?: string;
  photographer_url?: string;
  width?: number;
  height?: number;
}): Promise<CogRemixCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .insert({
      job_id: input.job_id,
      iteration_id: input.iteration_id,
      source: input.source,
      source_id: input.source_id,
      source_url: input.source_url,
      thumbnail_url: input.thumbnail_url,
      photographer: input.photographer || null,
      photographer_url: input.photographer_url || null,
      width: input.width || null,
      height: input.height || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixCandidate;
}

/**
 * Update a remix candidate - server-side
 */
export async function updateRemixCandidateServer(
  id: string,
  updates: Partial<CogRemixCandidate>
): Promise<CogRemixCandidate> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixCandidate;
}

/**
 * Append a trace entry to a remix job's trace array - server-side
 * Uses JSONB concatenation to atomically append
 */
export async function appendRemixTraceServer(
  jobId: string,
  entry: CogRemixTraceEntry
): Promise<void> {
  const client = await createClient();
  // Use raw SQL via rpc for atomic JSONB append
  const { error } = await (client as any).rpc('jsonb_array_append', {
    table_name: 'cog_remix_jobs',
    row_id: jobId,
    column_name: 'trace',
    new_element: entry,
  });

  if (error) {
    // Fallback: read-modify-write if rpc not available
    const { data: job } = await (client as any)
      .from('cog_remix_jobs')
      .select('trace')
      .eq('id', jobId)
      .single();

    const currentTrace = (job?.trace || []) as CogRemixTraceEntry[];
    currentTrace.push(entry);

    const { error: updateError } = await (client as any)
      .from('cog_remix_jobs')
      .update({ trace: currentTrace })
      .eq('id', jobId);

    if (updateError) throw updateError;
  }
}

/**
 * Get all candidates for a remix job (across all iterations) - server-side
 */
export async function getAllCandidatesForJobServer(jobId: string): Promise<CogRemixCandidate[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_candidates')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as CogRemixCandidate[];
}
