/**
 * Cog: Photographer, director, production config operations — Client-side
 */

import { supabase } from '../supabase';
import type {
  CogPhotographerConfig,
  CogPhotographerConfigInsert,
  CogPhotographerConfigUpdate,
  CogDirectorConfig,
  CogDirectorConfigInsert,
  CogDirectorConfigUpdate,
  CogProductionConfig,
  CogProductionConfigInsert,
  CogProductionConfigUpdate,
} from '../types/cog';

// ============================================================================
// Photographer Config Operations (Client)
// ============================================================================

/**
 * Create a photographer config - client-side
 */
export async function createPhotographerConfig(input: CogPhotographerConfigInsert): Promise<CogPhotographerConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_photographer_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      style_description: input.style_description,
      style_references: input.style_references,
      techniques: input.techniques,
      testbed_notes: input.testbed_notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Update a photographer config - client-side
 */
export async function updatePhotographerConfig(id: string, updates: CogPhotographerConfigUpdate): Promise<CogPhotographerConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_photographer_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogPhotographerConfig;
}

/**
 * Delete a photographer config - client-side
 */
export async function deletePhotographerConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_photographer_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Director Config Operations (Client)
// ============================================================================

/**
 * Create a director config - client-side
 */
export async function createDirectorConfig(input: CogDirectorConfigInsert): Promise<CogDirectorConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_director_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      approach_description: input.approach_description,
      methods: input.methods,
      interview_mapping: input.interview_mapping || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Update a director config - client-side
 */
export async function updateDirectorConfig(id: string, updates: CogDirectorConfigUpdate): Promise<CogDirectorConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_director_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogDirectorConfig;
}

/**
 * Delete a director config - client-side
 */
export async function deleteDirectorConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_director_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Production Config Operations (Client)
// ============================================================================

/**
 * Create a production config - client-side
 */
export async function createProductionConfig(input: CogProductionConfigInsert): Promise<CogProductionConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_production_configs')
    .insert({
      user_id: input.user_id,
      name: input.name,
      description: input.description || null,
      shoot_details: input.shoot_details,
      editorial_notes: input.editorial_notes,
      costume_notes: input.costume_notes,
      conceptual_notes: input.conceptual_notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Update a production config - client-side
 */
export async function updateProductionConfig(id: string, updates: CogProductionConfigUpdate): Promise<CogProductionConfig> {
  const { data, error } = await (supabase as any)
    .from('cog_production_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogProductionConfig;
}

/**
 * Delete a production config - client-side
 */
export async function deleteProductionConfig(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_production_configs')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
