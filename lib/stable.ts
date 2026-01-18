/**
 * Stable: Character Design and Asset Management
 * Database operations for character management system
 */

import { supabase } from './supabase';
import { createClient } from './supabase-server';
import type {
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  CharacterRelationship,
  CreateRelationshipInput,
  UpdateRelationshipInput,
  Asset,
  CreateAssetInput,
  UpdateAssetInput,
  CharacterWithRelations,
} from './types/stable';

// ============================================================================
// Character Operations
// ============================================================================

/**
 * Get all characters (client-side)
 */
export async function getCharacters(): Promise<Character[]> {
  const { data, error } = await supabase
    .from('stable_characters')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Character[];
}

/**
 * Get all characters (server-side)
 */
export async function getCharactersServer(): Promise<Character[]> {
  const client = await createClient();
  const { data, error } = await client
    .from('stable_characters')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  return data as Character[];
}

/**
 * Get a single character by ID (client-side)
 */
export async function getCharacter(id: string): Promise<Character> {
  const { data, error } = await supabase
    .from('stable_characters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Character;
}

/**
 * Get a single character by ID (server-side)
 */
export async function getCharacterServer(id: string): Promise<Character> {
  const client = await createClient();
  const { data, error } = await client
    .from('stable_characters')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Character;
}

/**
 * Get character with all related data (relationships, assets)
 */
export async function getCharacterWithRelations(
  id: string
): Promise<CharacterWithRelations> {
  const [character, relationships, assets] = await Promise.all([
    getCharacter(id),
    getCharacterRelationships(id),
    getCharacterAssets(id),
  ]);

  return {
    character,
    relationships,
    assets,
  };
}

/**
 * Get character with all related data (server-side)
 */
export async function getCharacterWithRelationsServer(
  id: string
): Promise<CharacterWithRelations> {
  const [character, relationships, assets] = await Promise.all([
    getCharacterServer(id),
    getCharacterRelationshipsServer(id),
    getCharacterAssetsServer(id),
  ]);

  return {
    character,
    relationships,
    assets,
  };
}

/**
 * Create a new character
 */
export async function createCharacter(
  input: CreateCharacterInput
): Promise<Character> {
  const { data, error } = await supabase
    .from('stable_characters')
    .insert({
      name: input.name,
      description: input.description || null,
      parametric_data: input.parametric_data || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Character;
}

/**
 * Update a character
 */
export async function updateCharacter(
  id: string,
  updates: UpdateCharacterInput
): Promise<Character> {
  const { data, error } = await supabase
    .from('stable_characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Character;
}

/**
 * Delete a character
 */
export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase
    .from('stable_characters')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Relationship Operations
// ============================================================================

/**
 * Get all relationships for a character (client-side)
 */
export async function getCharacterRelationships(
  characterId: string
): Promise<CharacterRelationship[]> {
  const { data, error } = await supabase
    .from('stable_character_relationships')
    .select('*')
    .or(`character_a_id.eq.${characterId},character_b_id.eq.${characterId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CharacterRelationship[];
}

/**
 * Get all relationships for a character (server-side)
 */
export async function getCharacterRelationshipsServer(
  characterId: string
): Promise<CharacterRelationship[]> {
  const client = await createClient();
  const { data, error } = await client
    .from('stable_character_relationships')
    .select('*')
    .or(`character_a_id.eq.${characterId},character_b_id.eq.${characterId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CharacterRelationship[];
}

/**
 * Create a relationship between two characters
 */
export async function createRelationship(
  input: CreateRelationshipInput
): Promise<CharacterRelationship> {
  const { data, error } = await supabase
    .from('stable_character_relationships')
    .insert({
      character_a_id: input.character_a_id,
      character_b_id: input.character_b_id,
      relationship_type: input.relationship_type,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CharacterRelationship;
}

/**
 * Update a relationship
 */
export async function updateRelationship(
  id: string,
  updates: UpdateRelationshipInput
): Promise<CharacterRelationship> {
  const { data, error } = await supabase
    .from('stable_character_relationships')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CharacterRelationship;
}

/**
 * Delete a relationship
 */
export async function deleteRelationship(id: string): Promise<void> {
  const { error } = await supabase
    .from('stable_character_relationships')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// Asset Operations
// ============================================================================

/**
 * Get all assets for a character (client-side)
 */
export async function getCharacterAssets(
  characterId: string
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('stable_assets')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Asset[];
}

/**
 * Get all assets for a character (server-side)
 */
export async function getCharacterAssetsServer(
  characterId: string
): Promise<Asset[]> {
  const client = await createClient();
  const { data, error } = await client
    .from('stable_assets')
    .select('*')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Asset[];
}

/**
 * Get assets by type for a character
 */
export async function getCharacterAssetsByType(
  characterId: string,
  assetType: string
): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('stable_assets')
    .select('*')
    .eq('character_id', characterId)
    .eq('asset_type', assetType)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Asset[];
}

/**
 * Get a single asset by ID
 */
export async function getAsset(id: string): Promise<Asset> {
  const { data, error } = await supabase
    .from('stable_assets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Asset;
}

/**
 * Create a new asset
 */
export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const { data, error } = await supabase
    .from('stable_assets')
    .insert({
      character_id: input.character_id,
      asset_type: input.asset_type,
      name: input.name || null,
      data: input.data || {},
      file_url: input.file_url || null,
      file_type: input.file_type || null,
      file_size: input.file_size || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as Asset;
}

/**
 * Update an asset
 */
export async function updateAsset(
  id: string,
  updates: UpdateAssetInput
): Promise<Asset> {
  const { data, error } = await supabase
    .from('stable_assets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Asset;
}

/**
 * Delete an asset
 */
export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from('stable_assets').delete().eq('id', id);

  if (error) throw error;
}

/**
 * Search assets by tags
 */
export async function searchAssetsByTags(tags: string[]): Promise<Asset[]> {
  const { data, error } = await supabase
    .from('stable_assets')
    .select('*')
    .overlaps('tags', tags)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Asset[];
}
