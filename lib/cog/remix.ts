/**
 * Cog: Remix job operations — Client-side
 */

import { supabase } from '../supabase';
import type {
  CogRemixJob,
  CogRemixJobInsert,
  CogRemixJobUpdate,
} from '../types/cog';

// ============================================================================
// Remix Job Operations (Client)
// ============================================================================

/**
 * Create a remix job - client-side
 */
export async function createRemixJob(input: CogRemixJobInsert): Promise<CogRemixJob> {
  const { data, error } = await (supabase as any)
    .from('cog_remix_jobs')
    .insert({
      series_id: input.series_id,
      title: input.title || null,
      story: input.story,
      topics: input.topics || [],
      colors: input.colors || [],
      status: input.status || 'draft',
      target_aspect_ratio: input.target_aspect_ratio || null,
      target_colors: input.target_colors || [],
      eval_profile_id: input.eval_profile_id || null,
      eval_profile_ids: input.eval_profile_ids || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Update a remix job - client-side
 */
export async function updateRemixJob(id: string, updates: CogRemixJobUpdate): Promise<CogRemixJob> {
  const { data, error } = await (supabase as any)
    .from('cog_remix_jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogRemixJob;
}

/**
 * Duplicate a remix job - client-side
 */
export async function duplicateRemixJob(jobId: string): Promise<CogRemixJob> {
  const { data: original, error: fetchError } = await (supabase as any)
    .from('cog_remix_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (fetchError) throw fetchError;

  const { data: newJob, error: createError } = await (supabase as any)
    .from('cog_remix_jobs')
    .insert({
      series_id: original.series_id,
      title: original.title ? `${original.title} (copy)` : null,
      story: original.story,
      topics: original.topics || [],
      colors: original.colors || [],
      target_aspect_ratio: original.target_aspect_ratio || null,
      target_colors: original.target_colors || [],
      eval_profile_id: original.eval_profile_id || null,
      eval_profile_ids: original.eval_profile_ids || [],
      status: 'draft',
    })
    .select()
    .single();

  if (createError) throw createError;
  return newJob as CogRemixJob;
}

/**
 * Delete a remix job - client-side
 */
export async function deleteRemixJob(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_remix_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
