'use server';

import sharp from 'sharp';
import {
  inpaintWithReplicate,
  getSpotRemovalPrompt,
} from '../replicate-inpainting';
import { createClient } from '@/lib/supabase-server';

export interface TouchupInput {
  /** The image ID to touchup */
  imageId: string;
  /** Base64-encoded mask PNG (white = edit area, black = preserve) */
  maskBase64: string;
  /** Touchup mode */
  mode: 'spot_removal' | 'guided_edit';
  /** Prompt for guided edit mode */
  prompt?: string;
  /** Guidance strength (0-100). Higher = more literal prompt following. Default 25 for spot, 30 for guided */
  guidance?: number;
  /** Quality/steps (1-50). Higher = better quality, slower. Default 28 */
  quality?: number;
  /** Random seed for reproducibility. Omit for random */
  seed?: number;
}

export interface TouchupResult {
  success: boolean;
  newImageId?: string;
  imageUrl?: string;
  storagePath?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Touchup an image using mask-based inpainting.
 * Creates a new image record with parent_image_id pointing to the source.
 */
export async function touchupCogImage(input: TouchupInput): Promise<TouchupResult> {
  const { imageId, maskBase64, mode, prompt, guidance, quality, seed } = input;
  const supabase = await createClient();

  try {
    // Fetch the source image
    const { data: sourceImage, error: imageError } = await (supabase as any)
      .from('cog_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (imageError) {
      throw new Error(`Failed to fetch image: ${imageError.message}`);
    }

    if (!sourceImage.storage_path) {
      throw new Error('Image has no storage path');
    }

    const seriesId = sourceImage.series_id;

    // Download the source image
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('cog-images')
      .download(sourceImage.storage_path);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    const imageBuffer = Buffer.from(await imageData.arrayBuffer());

    // Get actual image dimensions using sharp
    const imageMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = imageMetadata.width;
    const originalHeight = imageMetadata.height;

    if (!originalWidth || !originalHeight) {
      throw new Error('Could not determine image dimensions');
    }

    // Calculate target dimensions:
    // - Flux can handle up to 1024px well
    // - Divisible by 8 (standard requirement)
    // - Maintain aspect ratio
    const MAX_DIMENSION = 1024;

    let targetWidth: number;
    let targetHeight: number;

    if (originalWidth >= originalHeight) {
      // Landscape or square
      targetWidth = Math.min(MAX_DIMENSION, originalWidth);
      targetWidth = Math.floor(targetWidth / 8) * 8;
      const scale = targetWidth / originalWidth;
      targetHeight = Math.round(originalHeight * scale);
      targetHeight = Math.floor(targetHeight / 8) * 8;
    } else {
      // Portrait
      targetHeight = Math.min(MAX_DIMENSION, originalHeight);
      targetHeight = Math.floor(targetHeight / 8) * 8;
      const scale = targetHeight / originalHeight;
      targetWidth = Math.round(originalWidth * scale);
      targetWidth = Math.floor(targetWidth / 8) * 8;
    }

    // Ensure minimum dimensions (at least 64x64)
    targetWidth = Math.max(64, targetWidth);
    targetHeight = Math.max(64, targetHeight);

    console.log('Processing image for inpainting:', {
      original: `${originalWidth}x${originalHeight}`,
      target: `${targetWidth}x${targetHeight}`,
    });

    // Resize image to target dimensions
    const processedImageBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { fit: 'fill' })
      .png()
      .toBuffer();

    // Process mask:
    // 1. Decode from base64
    // 2. Resize to match image
    // 3. Extract single channel to create true grayscale
    const maskBuffer = Buffer.from(maskBase64, 'base64');

    // First resize the mask
    const resizedMask = await sharp(maskBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'nearest', // Preserve hard edges
      })
      .toBuffer();

    // Extract just the red channel (all channels are same for grayscale mask)
    // This creates a true single-channel image
    const processedMaskBuffer = await sharp(resizedMask)
      .extractChannel(0)
      .png()
      .toBuffer();

    // Verify mask properties
    const maskMetadata = await sharp(processedMaskBuffer).metadata();
    const maskStats = await sharp(processedMaskBuffer).stats();

    console.log('Mask verification:', {
      dimensions: `${maskMetadata.width}x${maskMetadata.height}`,
      channels: maskMetadata.channels,
      hasAlpha: maskMetadata.hasAlpha,
      min: maskStats.channels[0]?.min,
      max: maskStats.channels[0]?.max,
      mean: maskStats.channels[0]?.mean?.toFixed(2),
    });

    // Validate mask has some white pixels (edit area)
    if (maskStats.channels[0]?.max === 0) {
      throw new Error('Mask has no white pixels - nothing to edit');
    }

    // Build the inpainting prompt
    const inpaintPrompt = mode === 'spot_removal'
      ? getSpotRemovalPrompt()
      : prompt
        ? `${prompt}, high quality, detailed, photorealistic`
        : 'high quality, detailed';

    console.log('Calling inpainting API:', {
      mode,
      prompt: inpaintPrompt.slice(0, 80),
      imageSize: `${Math.round(processedImageBuffer.length / 1024)}KB`,
      maskSize: `${Math.round(processedMaskBuffer.length / 1024)}KB`,
    });

    // Call the inpainting API (flux-fill-dev model)
    // Use provided values or sensible defaults based on mode
    const defaultGuidance = mode === 'spot_removal' ? 25 : 30;
    const inpaintResult = await inpaintWithReplicate({
      imageBuffer: processedImageBuffer,
      maskBuffer: processedMaskBuffer,
      prompt: inpaintPrompt,
      guidanceScale: guidance ?? defaultGuidance,
      numInferenceSteps: quality ?? 28,
      seed,
      width: targetWidth,
      height: targetHeight,
    });

    // Upload the result image
    const timestamp = Date.now();
    const filename = `touchup_${timestamp}.png`;
    const storagePath = `${seriesId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from('cog-images')
      .upload(storagePath, inpaintResult.buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload touchup image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('cog-images')
      .getPublicUrl(storagePath);

    const imageUrl = urlData.publicUrl;

    // Create new image record with parent reference and inherited group
    const { data: newImage, error: insertError } = await (supabase as any)
      .from('cog_images')
      .insert({
        series_id: seriesId,
        job_id: sourceImage.job_id,
        parent_image_id: imageId,
        group_id: sourceImage.group_id || imageId, // Inherit group from parent
        storage_path: storagePath,
        filename,
        mime_type: 'image/png',
        source: 'generated',
        prompt: mode === 'spot_removal' ? 'Touchup: Spot removal' : `Touchup: ${prompt}`,
        metadata: {
          touchup: true,
          mode,
          parentImageId: imageId,
          durationMs: inpaintResult.durationMs,
          originalDimensions: `${originalWidth}x${originalHeight}`,
          processedDimensions: `${targetWidth}x${targetHeight}`,
          ...(mode === 'guided_edit' && { userPrompt: prompt }),
        },
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create image record: ${insertError.message}`);
    }

    console.log('Touchup complete:', {
      newImageId: newImage.id,
      durationMs: inpaintResult.durationMs,
    });

    return {
      success: true,
      newImageId: newImage.id,
      imageUrl,
      storagePath,
      durationMs: inpaintResult.durationMs,
    };
  } catch (error) {
    console.error('Touchup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
