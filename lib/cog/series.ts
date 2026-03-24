/**
 * Cog: Series CRUD operations
 */

import { supabase } from '../supabase';
import type {
  CogSeries,
  CogSeriesInsert,
  CogSeriesUpdate,
} from '../types/cog';

// ============================================================================
// Series Operations (Client)
// ============================================================================

/**
 * Create a new series - client-side
 */
export async function createSeries(input: CogSeriesInsert): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .insert({
      parent_id: input.parent_id || null,
      title: input.title,
      description: input.description || null,
      tags: input.tags || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Update a series - client-side
 */
export async function updateSeries(id: string, updates: CogSeriesUpdate): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Delete a series - client-side
 */
export async function deleteSeries(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_series')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Set the primary image for a series - client-side
 * When set, this image is displayed in grids instead of the root.
 * Pass null to clear and revert to showing the root image.
 */
export async function setSeriesPrimaryImage(seriesId: string, imageId: string | null): Promise<CogSeries> {
  const { data, error } = await (supabase as any)
    .from('cog_series')
    .update({ primary_image_id: imageId })
    .eq('id', seriesId)
    .select()
    .single();

  if (error) throw error;
  return data as CogSeries;
}

/**
 * Delete a series with full cleanup - removes storage files first, then DB records
 * Returns count of deleted images for confirmation
 */
export async function deleteSeriesWithCleanup(id: string): Promise<{ deletedImages: number }> {
  // First, get all images in this series to clean up storage
  const { data: images, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('storage_path, thumbnail_256, thumbnail_128, thumbnail_64')
    .eq('series_id', id);

  if (fetchError) throw fetchError;

  let originalCount = 0;
  const pathSet = new Set<string>();
  (images || []).forEach((img: {
    storage_path: string | null;
    thumbnail_256: string | null;
    thumbnail_128: string | null;
    thumbnail_64: string | null;
  }) => {
    if (img.storage_path) {
      pathSet.add(img.storage_path);
      originalCount += 1;
    }
    if (img.thumbnail_256) pathSet.add(img.thumbnail_256);
    if (img.thumbnail_128) pathSet.add(img.thumbnail_128);
    if (img.thumbnail_64) pathSet.add(img.thumbnail_64);
  });
  const imagePaths = Array.from(pathSet);

  // Delete images from storage (batch delete)
  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('cog-images')
      .remove(imagePaths);

    if (storageError) {
      console.error('Storage cleanup error (continuing anyway):', storageError);
      // Continue even if storage cleanup fails - DB cascade will handle records
    }
  }

  // Delete the series - CASCADE will handle all related DB records
  const { error: deleteError } = await (supabase as any)
    .from('cog_series')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  return { deletedImages: originalCount };
}
