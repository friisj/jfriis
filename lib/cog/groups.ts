/**
 * Cog: Image grouping operations
 */

import { supabase } from '../supabase';
import type {
  CogImage,
} from '../types/cog';

// ============================================================================
// Image Grouping Operations (Client)
// ============================================================================

/**
 * Get all images in the same group - client-side
 * Returns images in the group ordered by group_position (if set), then by created_at
 */
export async function getImageGroup(imageId: string): Promise<CogImage[]> {
  // First get the image to find its group_id
  const { data: image, error: imageError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (imageError) throw imageError;

  const groupId = image.group_id || image.id;

  // Get all images in this group
  const { data: groupImages, error: groupError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('group_id', groupId);

  if (groupError) throw groupError;

  // If no images found with group_id, fallback to legacy parent chain
  if (!groupImages || groupImages.length === 0) {
    return await getImageGroupLegacy(image);
  }

  // Sort by group_position (if set), then by created_at
  const sorted = (groupImages as CogImage[]).sort((a, b) => {
    // If both have positions, sort by position
    if (a.group_position !== null && b.group_position !== null) {
      return a.group_position - b.group_position;
    }
    // If only a has position, a comes first
    if (a.group_position !== null) return -1;
    // If only b has position, b comes first
    if (b.group_position !== null) return 1;
    // Neither has position, sort by created_at
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted;
}

/**
 * Legacy: Get the full version chain for an image using parent_image_id
 * Used as fallback for images created before group_id migration
 */
async function getImageGroupLegacy(image: CogImage): Promise<CogImage[]> {
  // Get all images in this series
  const { data: allImages, error: allError } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('series_id', image.series_id);

  if (allError) throw allError;

  // Build parent lookup
  const imageMap = new Map<string, CogImage>();
  const childrenMap = new Map<string, CogImage[]>();

  for (const img of allImages) {
    imageMap.set(img.id, img);
    if (img.parent_image_id) {
      const children = childrenMap.get(img.parent_image_id) || [];
      children.push(img);
      childrenMap.set(img.parent_image_id, children);
    }
  }

  // Find the root
  let root = image;
  while (root.parent_image_id) {
    const parent = imageMap.get(root.parent_image_id);
    if (!parent) break;
    root = parent;
  }

  // Build chain from root following creation time
  const chain: CogImage[] = [root];
  let current = root;
  while (true) {
    const children = childrenMap.get(current.id) || [];
    if (children.length === 0) break;
    const oldest = children.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    chain.push(oldest);
    current = oldest;
  }
  return chain;
}

// Legacy alias for backwards compatibility
export const getImageVersionChain = getImageGroup;

/**
 * Remove an image from its group - makes it its own group
 * If removing the group primary (id === group_id), remaining members get a new primary
 * Returns the updated image
 */
export async function removeImageFromGroup(imageId: string): Promise<CogImage> {
  // Get the image to check if it's the group primary
  const { data: image, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('id, group_id')
    .eq('id', imageId)
    .single();

  if (fetchError) throw fetchError;

  const currentGroupId = image.group_id || image.id;
  const isGroupPrimary = imageId === currentGroupId;

  // If this image is the group primary, reassign remaining members to a new primary
  if (isGroupPrimary) {
    // Find other group members
    const { data: groupMembers, error: groupError } = await (supabase as any)
      .from('cog_images')
      .select('id, created_at')
      .eq('group_id', currentGroupId)
      .neq('id', imageId)
      .order('created_at', { ascending: true });

    if (!groupError && groupMembers && groupMembers.length > 0) {
      // Reassign all remaining members to the oldest one as new primary
      const newPrimaryId = groupMembers[0].id;
      const memberIds = groupMembers.map((m: { id: string }) => m.id);

      const { error: regroupError } = await (supabase as any)
        .from('cog_images')
        .update({ group_id: newPrimaryId })
        .in('id', memberIds);

      if (regroupError) throw regroupError;
    }
  }

  // Set this image's group_id to its own id (becomes its own group)
  const { data: updatedImage, error: updateError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: imageId })
    .eq('id', imageId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updatedImage as CogImage;
}

/**
 * Reorder images within a group
 * Takes an array of image IDs in the desired order and updates their group_position
 */
export async function reorderGroupImages(imageIds: string[]): Promise<void> {
  // Update each image's group_position based on its index in the array
  for (let i = 0; i < imageIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_images')
      .update({ group_position: i })
      .eq('id', imageIds[i]);

    if (error) throw error;
  }
}

/**
 * Merge multiple images into a single group
 * The first image in the array becomes the group primary (group_id = its own id)
 * All other images get assigned to that group
 * Returns the new group primary ID
 */
export async function mergeImagesIntoGroup(imageIds: string[]): Promise<string> {
  if (imageIds.length === 0) {
    throw new Error('No images provided');
  }

  if (imageIds.length === 1) {
    // Single image already is its own group
    return imageIds[0];
  }

  // First image becomes the group primary
  const primaryId = imageIds[0];

  // Set the primary image's group_id to itself (in case it was part of another group)
  const { error: primaryError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: primaryId, group_position: 0 })
    .eq('id', primaryId);

  if (primaryError) throw primaryError;

  // Set all other images' group_id to the primary, with sequential positions
  for (let i = 1; i < imageIds.length; i++) {
    const { error } = await (supabase as any)
      .from('cog_images')
      .update({ group_id: primaryId, group_position: i })
      .eq('id', imageIds[i]);

    if (error) throw error;
  }

  return primaryId;
}

/**
 * Add an image to an existing group
 * The image is added at the end of the group
 */
export async function addImageToGroup(imageId: string, targetGroupId: string): Promise<void> {
  // Get the current max position in the target group
  const { data: groupImages, error: fetchError } = await (supabase as any)
    .from('cog_images')
    .select('group_position')
    .eq('group_id', targetGroupId)
    .order('group_position', { ascending: false, nullsFirst: false })
    .limit(1);

  if (fetchError) throw fetchError;

  // Calculate the new position (after the last one)
  let newPosition = 0;
  if (groupImages && groupImages.length > 0 && groupImages[0].group_position !== null) {
    newPosition = groupImages[0].group_position + 1;
  } else {
    // No positions set yet, count the images
    const { count } = await (supabase as any)
      .from('cog_images')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', targetGroupId);
    newPosition = count || 0;
  }

  // Update the image's group
  const { error: updateError } = await (supabase as any)
    .from('cog_images')
    .update({ group_id: targetGroupId, group_position: newPosition })
    .eq('id', imageId);

  if (updateError) throw updateError;
}
