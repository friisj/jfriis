/**
 * Sampler: Client-side CRUD operations
 *
 * Client data layer for collections, sounds, and pads.
 * Also exports cross-app API functions for use by other tools.
 */

import { supabase } from './supabase';
import type {
  SamplerCollection,
  CreateCollectionInput,
  UpdateCollectionInput,
  SamplerSound,
  CreateSoundInput,
  UpdateSoundInput,
  SamplerPad,
  CreatePadInput,
  UpdatePadInput,
  PadWithSound,
  CollectionWithPads,
} from './types/sampler';

// Re-export for convenience
export type { CollectionWithPads, PadWithSound, SamplerSound };

// NOTE: sampler_* tables not in generated Supabase types - using type assertions

// ============================================================================
// Collection Operations
// ============================================================================

export async function getCollections(): Promise<SamplerCollection[]> {
  const { data, error } = await (supabase as any)
    .from('sampler_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SamplerCollection[];
}

export async function getCollection(id: string): Promise<SamplerCollection> {
  const { data, error } = await (supabase as any)
    .from('sampler_collections')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as SamplerCollection;
}

export async function getCollectionBySlug(slug: string): Promise<SamplerCollection> {
  const { data, error } = await (supabase as any)
    .from('sampler_collections')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data as SamplerCollection;
}

export async function createCollection(input: CreateCollectionInput): Promise<SamplerCollection> {
  const { data, error } = await (supabase as any)
    .from('sampler_collections')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      grid_rows: input.grid_rows ?? 4,
      grid_cols: input.grid_cols ?? 4,
      color: input.color || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as SamplerCollection;
}

export async function updateCollection(
  id: string,
  updates: UpdateCollectionInput
): Promise<SamplerCollection> {
  const { data, error } = await (supabase as any)
    .from('sampler_collections')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SamplerCollection;
}

export async function deleteCollection(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('sampler_collections')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Sound Operations
// ============================================================================

export async function getSounds(): Promise<SamplerSound[]> {
  const { data, error } = await (supabase as any)
    .from('sampler_sounds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as SamplerSound[];
}

export async function getSound(id: string): Promise<SamplerSound> {
  const { data, error } = await (supabase as any)
    .from('sampler_sounds')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as SamplerSound;
}

export async function createSound(input: CreateSoundInput): Promise<SamplerSound> {
  const { data, error } = await (supabase as any)
    .from('sampler_sounds')
    .insert({
      name: input.name,
      type: input.type ?? 'file',
      source_config: input.source_config ?? {},
      audio_url: input.audio_url || null,
      duration_ms: input.duration_ms || null,
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as SamplerSound;
}

export async function updateSound(
  id: string,
  updates: UpdateSoundInput
): Promise<SamplerSound> {
  const { data, error } = await (supabase as any)
    .from('sampler_sounds')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SamplerSound;
}

export async function deleteSound(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('sampler_sounds')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Pad Operations
// ============================================================================

export async function getPads(collectionId: string): Promise<SamplerPad[]> {
  const { data, error } = await (supabase as any)
    .from('sampler_pads')
    .select('*')
    .eq('collection_id', collectionId)
    .order('row')
    .order('col');

  if (error) throw error;
  return data as SamplerPad[];
}

export async function createPad(input: CreatePadInput): Promise<SamplerPad> {
  const { data, error } = await (supabase as any)
    .from('sampler_pads')
    .insert({
      collection_id: input.collection_id,
      sound_id: input.sound_id || null,
      row: input.row,
      col: input.col,
      row_span: input.row_span ?? 1,
      col_span: input.col_span ?? 1,
      effects: input.effects ?? { volume: 0.8, pitch: 0 },
      label: input.label || null,
      color: input.color || null,
      pad_type: input.pad_type ?? 'trigger',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SamplerPad;
}

export async function updatePad(
  id: string,
  updates: UpdatePadInput
): Promise<SamplerPad> {
  const { data, error } = await (supabase as any)
    .from('sampler_pads')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SamplerPad;
}

export async function deletePad(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('sampler_pads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Cross-App API — use from other tools
// ============================================================================

/**
 * Get a full collection with all pads and their sounds.
 * Primary cross-app entry point for playing a collection.
 */
export async function getCollectionWithPads(slug: string): Promise<CollectionWithPads> {
  const collection = await getCollectionBySlug(slug);

  // Fetch pads with joined sound data
  const { data: pads, error } = await (supabase as any)
    .from('sampler_pads')
    .select('*, sound:sampler_sounds(*)')
    .eq('collection_id', collection.id)
    .order('row')
    .order('col');

  if (error) throw error;

  return {
    ...collection,
    pads: (pads as PadWithSound[]) ?? [],
  };
}

// ============================================================================
// Grid Initialization
// ============================================================================

/**
 * Initialize an empty grid of pads for a collection.
 * Creates one pad per cell in the grid.
 */
export async function initializeGrid(
  collectionId: string,
  rows: number,
  cols: number
): Promise<SamplerPad[]> {
  const padInputs = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      padInputs.push({
        collection_id: collectionId,
        row: r,
        col: c,
        effects: { volume: 0.8, pitch: 0 },
        pad_type: 'trigger',
      });
    }
  }

  const { data, error } = await (supabase as any)
    .from('sampler_pads')
    .insert(padInputs)
    .select();

  if (error) throw error;
  return data as SamplerPad[];
}

// ============================================================================
// Grid Expansion
// ============================================================================

/**
 * Expand a collection grid by adding rows. Creates pad records for the new cells
 * and updates the collection's grid_rows.
 */
export async function expandGrid(
  collectionId: string,
  currentRows: number,
  cols: number,
  additionalRows: number
): Promise<SamplerPad[]> {
  const padInputs = [];
  for (let r = currentRows; r < currentRows + additionalRows; r++) {
    for (let c = 0; c < cols; c++) {
      padInputs.push({
        collection_id: collectionId,
        row: r,
        col: c,
        effects: { volume: 0.8, pitch: 0 },
        pad_type: 'trigger',
      });
    }
  }

  const { data, error } = await (supabase as any)
    .from('sampler_pads')
    .insert(padInputs)
    .select();

  if (error) throw error;

  await updateCollection(collectionId, { grid_rows: currentRows + additionalRows });

  return data as SamplerPad[];
}

// ============================================================================
// Storage Helpers
// ============================================================================

export async function uploadAudio(
  file: File,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from('sampler-audio')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('sampler-audio')
    .getPublicUrl(path);

  return urlData.publicUrl;
}
