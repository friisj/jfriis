/**
 * Cog: Thinking job operations — Client-side
 */

import { supabase } from '../supabase';
import type {
  CogThinkingJob,
  CogThinkingJobInsert,
  CogThinkingJobUpdate,
} from '../types/cog';

// ============================================================================
// Thinking Job Operations (Client)
// ============================================================================

/**
 * Create a thinking job - client-side
 */
export async function createThinkingJob(input: CogThinkingJobInsert): Promise<CogThinkingJob> {
  const { data, error } = await (supabase as any)
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
 * Update a thinking job - client-side
 */
export async function updateThinkingJob(id: string, updates: CogThinkingJobUpdate): Promise<CogThinkingJob> {
  const { data, error } = await (supabase as any)
    .from('cog_thinking_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogThinkingJob;
}

/**
 * Delete a thinking job - client-side
 */
export async function deleteThinkingJob(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_thinking_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Duplicate a thinking job - copies config, resets status to draft, clears outputs
 */
export async function duplicateThinkingJob(jobId: string): Promise<CogThinkingJob> {
  const { data: original, error: fetchError } = await (supabase as any)
    .from('cog_thinking_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (fetchError) throw fetchError;

  const { data: newJob, error: createError } = await (supabase as any)
    .from('cog_thinking_jobs')
    .insert({
      series_id: original.series_id,
      title: original.title ? `${original.title} (copy)` : null,
      story: original.story,
      photographer: original.photographer,
      publication: original.publication,
      aspect_ratio: original.aspect_ratio || null,
      image_size: original.image_size || '2K',
      style_hints: original.style_hints || null,
      status: 'draft',
    })
    .select()
    .single();

  if (createError) throw createError;
  return newJob as CogThinkingJob;
}
