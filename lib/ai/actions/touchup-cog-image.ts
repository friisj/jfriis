'use server';

import sharp from 'sharp';
import {
  inpaintWithReplicate,
  INPAINTING_MODELS,
  getSpotRemovalPrompt,
  getDefaultNegativePrompt,
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
  const { imageId, maskBase64, mode, prompt } = input;
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
    const imageMimeType = sourceImage.mime_type || 'image/png';

    // Get actual image dimensions using sharp
    const imageMetadata = await sharp(imageBuffer).metadata();
    const originalWidth = imageMetadata.width;
    const originalHeight = imageMetadata.height;

    if (!originalWidth || !originalHeight) {
      throw new Error('Could not determine image dimensions');
    }

    // Using andreasjansson/stable-diffusion-inpainting which requires:
    // - Dimensions divisible by 8
    // - Image and mask pre-resized to matching dimensions
    // This model is more reliable than stability-ai version.

    const MAX_DIMENSION = 512; // SD 1.5 native resolution

    // Calculate target dimensions (multiples of 8)
    let targetWidth: number;
    let targetHeight: number;

    if (originalWidth > originalHeight) {
      // Landscape
      targetWidth = Math.min(MAX_DIMENSION, Math.floor(originalWidth / 8) * 8);
      targetWidth = Math.max(64, Math.min(1024, targetWidth));
      const scale = targetWidth / originalWidth;
      targetHeight = Math.floor((originalHeight * scale) / 8) * 8;
      targetHeight = Math.max(64, Math.min(1024, targetHeight));
    } else {
      // Portrait or square
      targetHeight = Math.min(MAX_DIMENSION, Math.floor(originalHeight / 8) * 8);
      targetHeight = Math.max(64, Math.min(1024, targetHeight));
      const scale = targetHeight / originalHeight;
      targetWidth = Math.floor((originalWidth * scale) / 8) * 8;
      targetWidth = Math.max(64, Math.min(1024, targetWidth));
    }

    console.log('Resizing for SD inpainting:', {
      from: `${originalWidth}x${originalHeight}`,
      to: `${targetWidth}x${targetHeight}`,
    });

    // Resize image to target dimensions
    const resizedImageBuffer = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
      })
      .png()
      .toBuffer();

    const processedImageBase64 = resizedImageBuffer.toString('base64');

    // Resize mask to exactly match image dimensions
    // Convert to grayscale (single channel) as required by the model
    const maskBuffer = Buffer.from(maskBase64, 'base64');

    const resizedMaskBuffer = await sharp(maskBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'fill',
        kernel: 'nearest',
      })
      .grayscale() // Convert to single-channel grayscale
      .png()
      .toBuffer();

    const finalMaskBase64 = resizedMaskBuffer.toString('base64');

    // Debug: Check mask statistics to ensure it has white pixels
    const maskStats = await sharp(resizedMaskBuffer).stats();
    console.log('Mask stats:', {
      channels: maskStats.channels.length,
      min: maskStats.channels[0]?.min,
      max: maskStats.channels[0]?.max,
      mean: maskStats.channels[0]?.mean?.toFixed(2),
    });

    // Build the inpainting prompt
    let inpaintPrompt: string;
    if (mode === 'spot_removal') {
      inpaintPrompt = getSpotRemovalPrompt();
    } else {
      // For guided edit, use the user's prompt with some quality enhancers
      inpaintPrompt = prompt
        ? `${prompt}, high quality, detailed, photorealistic`
        : 'high quality, detailed';
    }

    console.log('Touchup request:', {
      mode,
      prompt: inpaintPrompt.slice(0, 100),
      originalDimensions: `${originalWidth}x${originalHeight}`,
      targetDimensions: `${targetWidth}x${targetHeight}`,
      imageSize: Math.round((processedImageBase64.length * 0.75) / 1024) + 'KB',
      maskSize: Math.round((finalMaskBase64.length * 0.75) / 1024) + 'KB',
    });

    // Call the inpainting API with explicit dimensions
    // Using stability-ai model which is more reliable
    const inpaintResult = await inpaintWithReplicate({
      imageBase64: processedImageBase64,
      imageMimeType: 'image/png',
      maskBase64: finalMaskBase64,
      prompt: inpaintPrompt,
      negativePrompt: getDefaultNegativePrompt(),
      model: INPAINTING_MODELS.SD_INPAINTING,
      width: targetWidth,
      height: targetHeight,
      numInferenceSteps: 50,
      guidanceScale: mode === 'spot_removal' ? 7.5 : 8,
    });

    // Upload the result image
    const timestamp = Date.now();
    const filename = `touchup_${timestamp}.png`;
    const storagePath = `${seriesId}/${filename}`;

    const resultBuffer = Buffer.from(inpaintResult.base64, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('cog-images')
      .upload(storagePath, resultBuffer, {
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

    // Create new image record with parent reference
    const { data: newImage, error: insertError } = await (supabase as any)
      .from('cog_images')
      .insert({
        series_id: seriesId,
        job_id: sourceImage.job_id, // Preserve original job association if any
        parent_image_id: imageId, // Link to parent for version tracking
        storage_path: storagePath,
        filename,
        mime_type: 'image/png',
        source: 'generated',
        prompt: mode === 'spot_removal' ? 'Touchup: Spot removal' : `Touchup: ${prompt}`,
        metadata: {
          touchup: true,
          mode,
          parentImageId: imageId,
          model: inpaintResult.model,
          durationMs: inpaintResult.durationMs,
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
