/**
 * Cog: Eval profile operations — Client-side
 */

import { supabase } from '../supabase';
import type {
  CogEvalProfile,
  CogEvalProfileInsert,
  CogEvalProfileUpdate,
} from '../types/cog';

// ============================================================================
// Eval Profile Operations (Client)
// ============================================================================

/**
 * Get all eval profiles - client-side
 */
export async function getAllEvalProfiles(): Promise<CogEvalProfile[]> {
  const { data, error } = await (supabase as any)
    .from('cog_eval_profiles')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as CogEvalProfile[];
}

/**
 * Create an eval profile - client-side
 */
export async function createEvalProfile(input: CogEvalProfileInsert): Promise<CogEvalProfile> {
  const { data, error } = await (supabase as any)
    .from('cog_eval_profiles')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      system_prompt: input.system_prompt,
      criteria: input.criteria,
      selection_threshold: input.selection_threshold,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogEvalProfile;
}

/**
 * Update an eval profile - client-side
 */
export async function updateEvalProfile(id: string, updates: CogEvalProfileUpdate): Promise<CogEvalProfile> {
  const { data, error } = await (supabase as any)
    .from('cog_eval_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogEvalProfile;
}

/**
 * Delete an eval profile - client-side
 */
export async function deleteEvalProfile(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_eval_profiles')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
