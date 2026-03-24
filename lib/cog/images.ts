/**
 * Cog: Image CRUD, star ratings, and URL utilities
 */

import { supabase } from '../supabase';
import type {
  CogImage,
  CogImageInsert,
  CogImageUpdate,
} from '../types/cog';

// ============================================================================
// Storage Utilities
// ============================================================================

/**
 * Get the public URL for a cog image stored in Supabase
 */
export function getCogImageUrl(storagePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/cog-images/${storagePath}`;
}

/**
 * Get the appropriate thumbnail URL for an image
 * Falls back to original image if thumbnail not available
 * @param originalPath - Original image storage path
 * @param thumbnailPath - Thumbnail storage path (if available)
 * @param size - Thumbnail size to use (256, 128, or 64)
 */
export function getCogThumbnailUrl(
  originalPath: string,
  thumbnailPath?: string | null,
  size: 256 | 128 | 64 = 256
): string {
  // Use thumbnail if available, otherwise fall back to original
  const path = thumbnailPath || originalPath;
  return getCogImageUrl(path);
}

// ============================================================================
// Image Operations (Client)
// ============================================================================

/**
 * Create an image record - client-side
 * If group_id is not provided and parent_image_id is set, inherits parent's group_id
 * If neither is set, the DB trigger sets group_id to the new image's id
 */
export async function createImage(input: CogImageInsert): Promise<CogImage> {
  // If parent_image_id is provided but group_id isn't, fetch parent's group_id
  let groupId = input.group_id;
  if (!groupId && input.parent_image_id) {
    const { data: parent } = await (supabase as any)
      .from('cog_images')
      .select('group_id')
      .eq('id', input.parent_image_id)
      .single();
    if (parent?.group_id) {
      groupId = parent.group_id;
    }
  }

  const { data, error } = await (supabase as any)
    .from('cog_images')
    .insert({
      series_id: input.series_id,
      job_id: input.job_id || null,
      parent_image_id: input.parent_image_id || null,
      group_id: groupId || null, // null lets DB trigger set it to own id
      storage_path: input.storage_path,
      filename: input.filename,
      mime_type: input.mime_type || 'image/png',
      width: input.width || null,
      height: input.height || null,
      file_size: input.file_size || null,
      source: input.source,
      prompt: input.prompt || null,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Update an image - client-side
 */
export async function updateImage(id: string, updates: CogImageUpdate): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CogImage;
}

/**
 * Delete an image - client-side (simple, no cleanup)
 */
export async function deleteImage(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('cog_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Delete an image with full cleanup - client-side
 * Handles:
 * - Re-parenting children to this image's parent (preserves provenance chain)
 * - Re-grouping: if this is the group primary, reassign group to first remaining member
 * - Clearing primary_image_id if this is the primary image for the series
 * - Removing from storage
 * - Deleting the database record
 */
export async function deleteImageWithCleanup(id: string): Promise<void> {
  // 1. Fetch the image to get storage_path, parent_image_id, group_id, and series_id
  const { data: image, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('storage_path, thumbnail_256, thumbnail_128, thumbnail_64, parent_image_id, group_id, series_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Re-parent any children to this image's parent (for provenance tracking)
  const { error: reparentError } = await (supabase as any)
    .from('cog_images')
    .update({ parent_image_id: image.parent_image_id })
    .eq('parent_image_id', id);

  if (reparentError) throw reparentError;

  // 3. Handle group reassignment if this is the group primary
  const groupId = image.group_id || id;
  if (id === groupId) {
    // This image is the group primary - find other group members
    const { data: groupMembers, error: groupError } = await (supabase as any)
      .from('cog_images')
      .select('id, created_at')
      .eq('group_id', groupId)
      .neq('id', id)
      .order('created_at', { ascending: true });

    if (!groupError && groupMembers && groupMembers.length > 0) {
      // Reassign group_id for all remaining members to the oldest one
      const newGroupPrimary = groupMembers[0].id;
      const memberIds = groupMembers.map((m: { id: string }) => m.id);

      const { error: regroupError } = await (supabase as any)
        .from('cog_images')
        .update({ group_id: newGroupPrimary })
        .in('id', memberIds);

      if (regroupError) {
        console.error('Failed to reassign group (continuing):', regroupError);
      }
    }
  }

  // 4. Clear primary_image_id if this is the primary image for the series
  const { data: series } = await (supabase as any)
    .from('cog_series')
    .select('primary_image_id')
    .eq('id', image.series_id)
    .single();

  if (series?.primary_image_id === id) {
    const { error: clearPrimaryError } = await (supabase as any)
      .from('cog_series')
      .update({ primary_image_id: null })
      .eq('id', image.series_id);

    if (clearPrimaryError) {
      console.error('Failed to clear primary image (continuing):', clearPrimaryError);
    }
  }

  // 5. Delete the database record first — orphaned storage files are
  //    invisible to users and can be cleaned up, but orphaned DB records
  //    would show broken images in the UI.
  const { error: deleteError } = await (supabase as any)
    .from('cog_images')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  // 6. Clean up storage files (best-effort after DB deletion)
  const storagePaths = [
    image.storage_path,
    image.thumbnail_256,
    image.thumbnail_128,
    image.thumbnail_64,
  ].filter((p): p is string => Boolean(p));

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('cog-images')
      .remove(storagePaths);

    if (storageError) {
      console.error(`[deleteImageWithCleanup] Storage cleanup failed for ${id}:`, storageError.message);
    }
  }
}

// ============================================================================
// Image Star Rating (Client)
// ============================================================================

/**
 * Set the star rating for an image (0 = unrated, 1-5 = star rating)
 */
export async function setImageStarRating(imageId: string, rating: number): Promise<void> {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  const { error } = await (supabase as any)
    .from('cog_images')
    .update({ star_rating: clamped })
    .eq('id', imageId);

  if (error) throw error;
}

/**
 * Get a single image by ID - client-side
 */
export async function getImageById(id: string): Promise<CogImage> {
  const { data, error } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CogImage;
}
