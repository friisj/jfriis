import { createClient } from '../../supabase-server';
import type {
  CogEvalProfile,
  CogRemixEvalRun,
  CogRemixEvalResult,
  CogRemixEvalRunFull,
} from '../../types/cog';

// ============================================================================
// Eval Profile Operations (Server)
// ============================================================================

/**
 * Get all eval profiles ordered by name - server-side
 */
export async function getAllEvalProfilesServer(): Promise<CogEvalProfile[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_eval_profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogEvalProfile[];
}

/**
 * Get a single eval profile by ID - server-side
 */
export async function getEvalProfileByIdServer(id: string): Promise<CogEvalProfile> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_eval_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogEvalProfile;
}

/**
 * Batch-fetch eval profiles by ID array, preserving order - server-side
 */
export async function getEvalProfilesByIdsServer(ids: string[]): Promise<CogEvalProfile[]> {
  if (ids.length === 0) return [];
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_eval_profiles')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  const profileMap = new Map<string, CogEvalProfile>();
  for (const p of (data || []) as CogEvalProfile[]) {
    profileMap.set(p.id, p);
  }
  return ids.map(id => profileMap.get(id)).filter((p): p is CogEvalProfile => !!p);
}

/**
 * Get all eval runs for a job, with profile and results - server-side
 */
export async function getRemixEvalRunsForJobServer(jobId: string): Promise<CogRemixEvalRunFull[]> {
  const client = await createClient();

  const { data: runs, error: runsError } = await (client as any)
    .from('cog_remix_eval_runs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (runsError) throw runsError;
  if (!runs || runs.length === 0) return [];

  // Fetch profiles and results for all runs
  const profileIds = [...new Set((runs as CogRemixEvalRun[]).map(r => r.eval_profile_id))];
  const runIds = (runs as CogRemixEvalRun[]).map(r => r.id);

  const [profilesResult, resultsResult] = await Promise.all([
    (client as any).from('cog_eval_profiles').select('*').in('id', profileIds),
    (client as any).from('cog_remix_eval_results').select('*').in('run_id', runIds).order('created_at', { ascending: true }),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (resultsResult.error) throw resultsResult.error;

  const profileMap = new Map<string, CogEvalProfile>();
  for (const p of (profilesResult.data || []) as CogEvalProfile[]) {
    profileMap.set(p.id, p);
  }

  const resultsByRun = new Map<string, CogRemixEvalResult[]>();
  for (const r of (resultsResult.data || []) as CogRemixEvalResult[]) {
    const existing = resultsByRun.get(r.run_id) || [];
    existing.push(r);
    resultsByRun.set(r.run_id, existing);
  }

  return (runs as CogRemixEvalRun[]).map(run => ({
    ...run,
    profile: profileMap.get(run.eval_profile_id)!,
    results: resultsByRun.get(run.id) || [],
  }));
}

/**
 * Create an eval run record - server-side
 */
export async function createRemixEvalRunServer(input: {
  job_id: string;
  eval_profile_id: string;
  status?: string;
  is_initial?: boolean;
}): Promise<CogRemixEvalRun> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_runs')
    .insert({
      job_id: input.job_id,
      eval_profile_id: input.eval_profile_id,
      status: input.status || 'pending',
      is_initial: input.is_initial || false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalRun;
}

/**
 * Update an eval run status - server-side
 */
export async function updateRemixEvalRunServer(
  id: string,
  updates: Partial<CogRemixEvalRun>
): Promise<CogRemixEvalRun> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_runs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalRun;
}

/**
 * Create an eval result record - server-side
 */
export async function createRemixEvalResultServer(input: {
  run_id: string;
  candidate_id: string;
  score: number | null;
  reasoning: string | null;
  criterion_scores: Record<string, number> | null;
}): Promise<CogRemixEvalResult> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_remix_eval_results')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixEvalResult;
}
