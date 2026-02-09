'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Set an image as the primary image in its group
 * Makes this image the group_id for all images in the group
 */
export async function setPrimaryImage(imageId: string) {
  const supabase = await createClient()

  try {
    // Get the image and its current group
    const { data: image, error: fetchError } = await (supabase as any)
      .from('cog_images')
      .select('group_id')
      .eq('id', imageId)
      .single()

    if (fetchError || !image || !image.group_id) {
      throw new Error('Image or group not found')
    }

    const oldGroupId = image.group_id

    // Update all images in the group to have this image as their new group_id
    const { error: updateError } = await (supabase as any)
      .from('cog_images')
      .update({ group_id: imageId })
      .eq('group_id', oldGroupId)

    if (updateError) {
      throw new Error(`Failed to set primary: ${updateError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Set primary error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set primary image',
    }
  }
}

/**
 * Remove an image from its group (set group_id to its own id, making it its own group)
 */
export async function removeFromGroup(imageId: string) {
  const supabase = await createClient()

  try {
    const { error: updateError } = await (supabase as any)
      .from('cog_images')
      .update({ group_id: imageId })
      .eq('id', imageId)

    if (updateError) {
      throw new Error(`Failed to remove from group: ${updateError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Remove from group error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove from group',
    }
  }
}

/**
 * Delete an image (storage + database record)
 */
export async function deleteImage(imageId: string) {
  const supabase = await createClient()

  try {
    // Get image storage path
    const { data: image, error: fetchError } = await (supabase as any)
      .from('cog_images')
      .select('storage_path')
      .eq('id', imageId)
      .single()

    if (fetchError || !image) {
      throw new Error('Image not found')
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage.from('images').remove([image.storage_path])

    if (storageError) {
      console.warn('Storage deletion failed:', storageError)
      // Continue anyway - record deletion is more critical
    }

    // Delete database record
    const { error: deleteError } = await (supabase as any).from('cog_images').delete().eq('id', imageId)

    if (deleteError) {
      throw new Error(`Failed to delete image: ${deleteError.message}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Delete image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete image',
    }
  }
}
