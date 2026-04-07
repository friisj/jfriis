'use server'

import { createClient } from '@/lib/supabase-server'
import { generateImageWithGemini3Pro } from '@/lib/ai/gemini-multimodal'
import { createImageServer } from '@/lib/cog/server'

const ISOMETRIC_SYSTEM = `You are generating isometric game assets for a top-down melee survival game set on an island of Roman ruins built over something older. The visual layers are:
- Norse: temporary player-built construction (wood, rope, animal hide, improvised)
- Roman: permanent infrastructure (stone keeps, paved roads, arched tunnels, defensive walls)
- Deep: ancient subterranean spaces (carved stone, glowing materials, strange geometry)

All assets should be rendered in clean isometric perspective (approximately 30° angle). Assets must be readable at small sizes for top-down gameplay. Use consistent lighting (top-left sun). Render on a transparent or neutral background suitable for compositing.`

// ---------------------------------------------------------------------------
// Generate isometric asset images
// ---------------------------------------------------------------------------

export async function generateIsometricAsset(input: {
  prompt: string
  referenceImageIds: string[]
  seriesId: string
  numImages: number
  aspectRatio: string
}) {
  const { prompt, referenceImageIds, seriesId, numImages, aspectRatio } = input
  const supabase = await createClient()

  // Load reference images if provided
  const referenceImages: { base64: string; mimeType: string }[] = []
  if (referenceImageIds.length > 0) {
    for (const imageId of referenceImageIds) {
      const { data: imgRow } = await (supabase as any)
        .from('cog_images')
        .select('storage_path, mime_type')
        .eq('id', imageId)
        .single()

      if (imgRow) {
        const { data: fileData } = await supabase.storage
          .from('cog-images')
          .download(imgRow.storage_path)

        if (fileData) {
          const buffer = Buffer.from(await fileData.arrayBuffer())
          referenceImages.push({
            base64: buffer.toString('base64'),
            mimeType: imgRow.mime_type || 'image/png',
          })
        }
      }
    }
  }

  const fullPrompt = `${ISOMETRIC_SYSTEM}\n\n${prompt}`

  // Generate N images
  for (let i = 0; i < numImages; i++) {
    const result = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      aspectRatio: aspectRatio as any,
      imageSize: '2K',
    })

    const ext = result.mimeType === 'image/png' ? 'png' : 'jpeg'
    const filename = `bonkhold-iso-${Date.now()}-${i}.${ext}`
    const storagePath = `bonkhold/${filename}`

    // Upload to storage
    const buffer = Buffer.from(result.base64, 'base64')
    await supabase.storage
      .from('cog-images')
      .upload(storagePath, buffer, { contentType: result.mimeType })

    // Create image record
    await createImageServer({
      series_id: seriesId,
      storage_path: storagePath,
      filename,
      mime_type: result.mimeType,
      source: 'generated',
      prompt: prompt,
      metadata: {
        generator: 'bonkhold-isometric-gen',
        aspect_ratio: aspectRatio,
        reference_count: referenceImageIds.length,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Generate 3 rotation variants from a canonical image
// ---------------------------------------------------------------------------

export async function generateRotationVariants(input: {
  sourceImageId: string
  seriesId: string
  originalPrompt: string
}) {
  const { sourceImageId, seriesId, originalPrompt } = input
  const supabase = await createClient()

  // Load source image
  const { data: sourceRow } = await (supabase as any)
    .from('cog_images')
    .select('storage_path, mime_type, prompt')
    .eq('id', sourceImageId)
    .single()

  if (!sourceRow) throw new Error('Source image not found')

  const { data: fileData } = await supabase.storage
    .from('cog-images')
    .download(sourceRow.storage_path)

  if (!fileData) throw new Error('Failed to download source image')

  const buffer = Buffer.from(await fileData.arrayBuffer())
  const sourceBase64 = buffer.toString('base64')
  const sourceMime = sourceRow.mime_type || 'image/png'

  const basePrompt = originalPrompt || sourceRow.prompt || 'isometric building'
  const rotations = [
    { angle: 90, label: '90° clockwise rotation' },
    { angle: 180, label: '180° rotation (rear view)' },
    { angle: 270, label: '270° clockwise rotation (90° counter-clockwise)' },
  ]

  for (const rotation of rotations) {
    const rotationPrompt = `${ISOMETRIC_SYSTEM}

This is the canonical isometric view of the structure. Generate the same structure rotated ${rotation.label} around its vertical axis, maintaining the same isometric projection angle, lighting direction, level of detail, and art style. The structure's proportions, materials, and features must match exactly — only the viewing angle changes.

Original description: ${basePrompt}`

    const result = await generateImageWithGemini3Pro({
      prompt: rotationPrompt,
      referenceImages: [{ base64: sourceBase64, mimeType: sourceMime }],
      aspectRatio: '1:1',
      imageSize: '2K',
    })

    const ext = result.mimeType === 'image/png' ? 'png' : 'jpeg'
    const filename = `bonkhold-rot${rotation.angle}-${Date.now()}.${ext}`
    const storagePath = `bonkhold/${filename}`

    const imgBuffer = Buffer.from(result.base64, 'base64')
    await supabase.storage
      .from('cog-images')
      .upload(storagePath, imgBuffer, { contentType: result.mimeType })

    await createImageServer({
      series_id: seriesId,
      storage_path: storagePath,
      filename,
      mime_type: result.mimeType,
      source: 'generated',
      prompt: `[${rotation.angle}° rotation] ${basePrompt}`,
      parent_image_id: sourceImageId,
      group_id: sourceImageId,
      metadata: {
        generator: 'bonkhold-isometric-gen',
        rotation_angle: rotation.angle,
        source_image_id: sourceImageId,
      },
    })
  }
}
