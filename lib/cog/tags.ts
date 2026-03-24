/**
 * Cog: Tag groups, tags, series tags, and image tags
 */

import { supabase } from '../supabase';
import type {
  CogTagGroup,
  CogTagGroupInsert,
  CogTagGroupUpdate,
  CogTag,
  CogTagInsert,
  CogTagUpdate,
  CogSeriesTag,
  CogImageTag,
} from '../types/cog';

// ============================================================================
// Tag Group Operations (Client)
// ============================================================================

/**
 * Create a new tag group - client-side
 */
export async function createTagGroup(input: CogTagGroupInsert): Promise<CogTagGroup> {
  const { data, error } = await (supabase as any)
    .from('cog_tag_groups')
    .insert({
      name: input.name,
      color: input.color || null,
      position: input.position || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogTagGroup;
}

/**
 * Update a tag group - client-side
 */
export async function updateTagGroup(id: string, updates: CogTagGroupUpdate): Promise<CogTagGroup> {
  const { data, error } = await (supabase as any)
    .from('cog_tag_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogTagGroup;
}

/**
 * Delete a tag group - client-side
 */
export async function deleteTagGroup(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_tag_groups')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder tag groups - client-side
 */
export async function reorderTagGroups(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('cog_tag_groups')
      .update({ position: update.position })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================================================
// Tag Operations (Client)
// ============================================================================

/**
 * Create a new tag - client-side
 */
export async function createTag(input: CogTagInsert): Promise<CogTag> {
  const { data, error } = await (supabase as any)
    .from('cog_tags')
    .insert({
      series_id: input.series_id || null,
      group_id: input.group_id || null,
      name: input.name,
      shortcut: input.shortcut || null,
      color: input.color || null,
      position: input.position || 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogTag;
}

/**
 * Update a tag - client-side
 */
export async function updateTag(id: string, updates: CogTagUpdate): Promise<CogTag> {
  const { data, error } = await (supabase as any)
    .from('cog_tags')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogTag;
}

/**
 * Delete a tag - client-side
 */
export async function deleteTag(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_tags')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Reorder tags within a group - client-side
 */
export async function reorderTags(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) => ({
    id,
    position: index,
  }));

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('cog_tags')
      .update({ position: update.position })
      .eq('id', update.id);

    if (error) throw error;
  }
}

// ============================================================================
// Series Tag Operations (Client)
// ============================================================================

/**
 * Enable a global tag for a series - client-side
 */
export async function enableTagForSeries(seriesId: string, tagId: string, position?: number): Promise<CogSeriesTag> {
  // Get current max position if not provided
  let pos = position;
  if (pos === undefined) {
    const { data: existing } = await (supabase as any)
      .from('cog_series_tags')
      .select('position')
      .eq('series_id', seriesId)
      .order('position', { ascending: false })
      .limit(1);

    pos = existing && existing.length > 0 ? existing[0].position + 1 : 0;
  }

  const { data, error } = await (supabase as any)
    .from('cog_series_tags')
    .insert({
      series_id: seriesId,
      tag_id: tagId,
      position: pos,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogSeriesTag;
}

/**
 * Disable a global tag for a series - client-side
 */
export async function disableTagForSeries(seriesId: string, tagId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_series_tags')
    .delete()
    .eq('series_id', seriesId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Reorder enabled tags for a series - client-side
 */
export async function reorderSeriesTags(seriesId: string, orderedTagIds: string[]): Promise<void> {
  for (let i = 0; i < orderedTagIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_series_tags')
      .update({ position: i })
      .eq('series_id', seriesId)
      .eq('tag_id', orderedTagIds[i]);

    if (error) throw error;
  }
}

// ============================================================================
// Image Tag Operations (Client)
// ============================================================================

/**
 * Add a tag to an image - client-side
 */
export async function addTagToImage(imageId: string, tagId: string): Promise<CogImageTag> {
  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .insert({
      image_id: imageId,
      tag_id: tagId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogImageTag;
}

/**
 * Remove a tag from an image - client-side
 */
export async function removeTagFromImage(imageId: string, tagId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_image_tags')
    .delete()
    .eq('image_id', imageId)
    .eq('tag_id', tagId);

  if (error) throw error;
}

/**
 * Toggle a tag on/off for an image - client-side
 * Returns true if tag was added, false if removed
 */
export async function toggleImageTag(imageId: string, tagId: string): Promise<boolean> {
  // Check if tag is currently applied
  const { data: existing } = await (supabase as any)
    .from('cog_image_tags')
    .select('id')
    .eq('image_id', imageId)
    .eq('tag_id', tagId)
    .single();

  if (existing) {
    // Tag exists, remove it
    await removeTagFromImage(imageId, tagId);
    return false;
  } else {
    // Tag doesn't exist, add it
    await addTagToImage(imageId, tagId);
    return true;
  }
}

/**
 * Get all tags for an image - client-side
 */
export async function getImageTags(imageId: string): Promise<CogTag[]> {
  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .select('tag:cog_tags(*)')
    .eq('image_id', imageId);

  if (error) throw error;
  return (data || []).map((row: { tag: CogTag }) => row.tag);
}

/**
 * Batch get tags for multiple images - client-side
 */
export async function getImageTagsBatch(imageIds: string[]): Promise<Map<string, CogTag[]>> {
  if (imageIds.length === 0) return new Map();

  const { data, error } = await (supabase as any)
    .from('cog_image_tags')
    .select('image_id, tag:cog_tags(*)')
    .in('image_id', imageIds);

  if (error) throw error;

  const tagsByImage = new Map<string, CogTag[]>();
  for (const row of data || []) {
    const existing = tagsByImage.get(row.image_id) || [];
    existing.push(row.tag);
    tagsByImage.set(row.image_id, existing);
  }

  return tagsByImage;
}
