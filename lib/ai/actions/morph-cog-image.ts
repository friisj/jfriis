'use server'

import { createClient } from '@/lib/supabase-server'
import { nanoid } from 'nanoid'

interface MorphCogImageParams {
  originalImageId: string
  morphedImageDataURL: string
}

export async function morphCogImage({ originalImageId, morphedImageDataURL }: MorphCogImageParams) {
  const supabase = await createClient()

  try {
    // 1. Get original image to find its series and group
    const { data: originalImage, error: fetchError } = await (supabase as any)
      .from('cog_images')
      .select('series_id, job_id, group_id, prompt, resolution, aspect_ratio')
      .eq('id', originalImageId)
      .single()

    if (fetchError || !originalImage) {
      throw new Error('Original image not found')
    }

    // 2. Convert data URL to buffer
    const base64Data = morphedImageDataURL.split(',')[1]
    const blob = Buffer.from(base64Data, 'base64')

    // 3. Upload to storage
    const filename = `${nanoid()}.png`
    const storagePath = `cog/${originalImage.series_id}/${filename}`

    const { error: uploadError } = await supabase.storage.from('images').upload(storagePath, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
    })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // 4. Create new image record
    const { data: newImage, error: insertError } = await (supabase as any)
      .from('cog_images')
      .insert({
        series_id: originalImage.series_id,
        job_id: originalImage.job_id,
        parent_image_id: originalImageId,
        group_id: originalImage.group_id || originalImageId,
        storage_path: storagePath,
        filename,
        mime_type: 'image/png',
        source: 'generated',
        prompt: `${originalImage.prompt} (morphed)`,
        resolution: originalImage.resolution,
        aspect_ratio: originalImage.aspect_ratio,
        metadata: {
          morph: true,
          parentImageId: originalImageId,
        },
      })
      .select()
      .single()

    if (insertError || !newImage) {
      throw new Error(`Failed to create image record: ${insertError?.message}`)
    }

    return { success: true, imageId: newImage.id }
  } catch (error) {
    console.error('Morph image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to morph image',
    }
  }
}
