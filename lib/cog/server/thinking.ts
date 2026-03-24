import { createClient } from '../../supabase-server';
import type {
  CogThinkingJob,
  CogThinkingJobFull,
  CogThinkingJobUpdate,
  CogThinkingJobInsert,
  CogRemixTraceEntry,
} from '../../types/cog';

// ============================================================================
// Thinking Job Operations (Server)
// ============================================================================

/**
 * Get a single thinking job by ID - server-side
 */
export async function getThinkingJobByIdServer(id: string): Promise<CogThinkingJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_thinking_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogThinkingJob;
}

/**
 * Get a thinking job with resolved generated image - server-side
 */
export async function getThinkingJobFullServer(id: string): Promise<CogThinkingJobFull> {
  const client = await createClient();
  const { data: job, error: jobError } = await (client as any)
    .from('cog_thinking_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (jobError) throw jobError;

  let generatedImage = null;
  if (job.generated_image_id) {
    const { data: img } = await (client as any)
      .from('cog_images')
      .select('*')
      .eq('id', job.generated_image_id)
      .single();
    generatedImage = img || null;
  }

  return {
    ...job,
    generated_image: generatedImage,
  } as CogThinkingJobFull;
}

/**
 * Get thinking jobs for a series - server-side
 */
export async function getThinkingJobsForSeriesServer(seriesId: string): Promise<CogThinkingJob[]> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_thinking_jobs')
    .select('*')
    .eq('series_id', seriesId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CogThinkingJob[];
}

/**
 * Update a thinking job - server-side
 */
export async function updateThinkingJobServer(id: string, updates: CogThinkingJobUpdate): Promise<CogThinkingJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_thinking_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogThinkingJob;
}

/**
 * Create a thinking job - server-side
 */
export async function createThinkingJobServer(input: CogThinkingJobInsert): Promise<CogThinkingJob> {
  const client = await createClient();
  const { data, error } = await (client as any)
    .from('cog_thinking_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title || null,
      story: input.story,
      photographer: input.photographer,
      publication: input.publication,
      aspect_ratio: input.aspect_ratio || null,
      image_size: input.image_size || '2K',
      style_hints: input.style_hints || null,
      status: input.status || 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogThinkingJob;
}

/**
 * Append a trace entry to a thinking job's trace array - server-side
 */
export async function appendThinkingTraceServer(
  jobId: string,
  entry: CogRemixTraceEntry
): Promise<void> {
  const client = await createClient();
  const { error } = await (client as any).rpc('jsonb_array_append', {
    table_name: 'cog_thinking_jobs',
    row_id: jobId,
    column_name: 'trace',
    new_element: entry,
  });

  if (error) {
    // Fallback: read-modify-write if rpc not available
    const { data: job } = await (client as any)
      .from('cog_thinking_jobs')
      .select('trace')
      .eq('id', jobId)
      .single();

    const currentTrace = (job?.trace || []) as CogRemixTraceEntry[];
    currentTrace.push(entry);

    const { error: updateError } = await (client as any)
      .from('cog_thinking_jobs')
      .update({ trace: currentTrace })
      .eq('id', jobId);

    if (updateError) throw updateError;
  }
}
