'use server'

import sharp from 'sharp'
import { createClient } from '@/lib/supabase-server'

interface ThumbnailSizes {
  256: string
  128: string
  64: string
}

/**
 * Generate WebP thumbnails for an uploaded image
 * Creates 256x256, 128x128, and 64x64 thumbnails
 * @param imageId - Database ID of the image record
 * @param storagePath - Original image storage path
 * @returns Object with thumbnail paths or null on failure
 */
export async function generateThumbnails(
  imageId: string,
  storagePath: string
): Promise<ThumbnailSizes | null> {
  const supabase = await createClient()

  try {
    // Download the original image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('cog-images')
      .download(storagePath)

    if (downloadError || !imageData) {
      console.error('Failed to download image for thumbnail generation:', downloadError)
      return null
    }

    // Convert blob to buffer
    const buffer = Buffer.from(await imageData.arrayBuffer())

    // Generate thumbnails at different sizes
    const thumbnailPaths: Partial<ThumbnailSizes> = {}
    const sizes = [256, 128, 64] as const

    for (const size of sizes) {
      try {
        // Resize and convert to WebP
        const thumbnailBuffer = await sharp(buffer)
          .resize(size, size, {
            fit: 'cover',
            position: 'center',
          })
          .webp({
            quality: 85,
            effort: 4, // Balance between compression and speed
          })
          .toBuffer()

        // Generate storage path for thumbnail
        const thumbPath = storagePath.replace(
          /\.(png|jpg|jpeg|webp|gif)$/i,
          `_thumb${size}.webp`
        )

        // Upload thumbnail
        const { error: uploadError } = await supabase.storage
          .from('cog-images')
          .upload(thumbPath, thumbnailBuffer, {
            contentType: 'image/webp',
            upsert: true,
          })

        if (uploadError) {
          console.error(`Failed to upload ${size}px thumbnail:`, uploadError)
          continue
        }

        thumbnailPaths[size] = thumbPath
      } catch (error) {
        console.error(`Error generating ${size}px thumbnail:`, error)
      }
    }

    // Update database record with thumbnail paths
    if (Object.keys(thumbnailPaths).length > 0) {
      const { error: updateError } = await (supabase as any)
        .from('cog_images')
        .update({
          thumbnail_256: thumbnailPaths[256] || null,
          thumbnail_128: thumbnailPaths[128] || null,
          thumbnail_64: thumbnailPaths[64] || null,
        })
        .eq('id', imageId)

      if (updateError) {
        console.error('Failed to update image record with thumbnails:', updateError)
        return null
      }
    }

    return thumbnailPaths as ThumbnailSizes
  } catch (error) {
    console.error('Thumbnail generation failed:', error)
    return null
  }
}

/**
 * Batch generate thumbnails for multiple images
 * Useful for backfilling existing images
 */
export async function batchGenerateThumbnails(imageIds: string[]): Promise<{
  success: number
  failed: number
}> {
  let success = 0
  let failed = 0

  const supabase = await createClient()

  for (const imageId of imageIds) {
    try {
      // Get image storage path
      const { data: image, error: fetchError } = await (supabase as any)
        .from('cog_images')
        .select('storage_path')
        .eq('id', imageId)
        .single()

      if (fetchError || !image) {
        failed++
        continue
      }

      const result = await generateThumbnails(imageId, image.storage_path)
      if (result) {
        success++
      } else {
        failed++
      }
    } catch (error) {
      console.error(`Failed to generate thumbnails for image ${imageId}:`, error)
      failed++
    }
  }

  return { success, failed }
}
