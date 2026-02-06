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

    // SDXL inpainting works best with images around 1024px
    // Resize large images to prevent model errors
    const MAX_DIMENSION = 1024;
    const needsResize = originalWidth > MAX_DIMENSION || originalHeight > MAX_DIMENSION;

    let processedWidth = originalWidth;
    let processedHeight = originalHeight;
    let processedImageBase64: string;

    if (needsResize) {
      // Calculate new dimensions maintaining aspect ratio
      const scale = MAX_DIMENSION / Math.max(originalWidth, originalHeight);
      processedWidth = Math.round(originalWidth * scale);
      processedHeight = Math.round(originalHeight * scale);

      console.log('Resizing image for model compatibility:', {
        from: `${originalWidth}x${originalHeight}`,
        to: `${processedWidth}x${processedHeight}`,
      });

      const resizedImageBuffer = await sharp(imageBuffer)
        .resize(processedWidth, processedHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();

      processedImageBase64 = resizedImageBuffer.toString('base64');
    } else {
      processedImageBase64 = imageBuffer.toString('base64');
    }

    // Resize mask to match the processed image dimensions
    const maskBuffer = Buffer.from(maskBase64, 'base64');
    const maskMetadata = await sharp(maskBuffer).metadata();

    console.log('Resizing mask to match processed image:', {
      from: `${maskMetadata.width}x${maskMetadata.height}`,
      to: `${processedWidth}x${processedHeight}`,
    });

    const resizedMaskBuffer = await sharp(maskBuffer)
      .resize(processedWidth, processedHeight, {
        fit: 'fill', // Stretch to exact dimensions
        kernel: 'nearest', // Use nearest-neighbor to preserve hard edges in mask
      })
      .png()
      .toBuffer();

    const resizedMaskBase64 = resizedMaskBuffer.toString('base64');

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
      processedDimensions: `${processedWidth}x${processedHeight}`,
      imageSize: Math.round((processedImageBase64.length * 0.75) / 1024) + 'KB',
      maskSize: Math.round((resizedMaskBase64.length * 0.75) / 1024) + 'KB',
    });

    // Call the inpainting API
    const inpaintResult = await inpaintWithReplicate({
      imageBase64: processedImageBase64,
      imageMimeType: 'image/png', // We converted to PNG during resize
      maskBase64: resizedMaskBase64,
      prompt: inpaintPrompt,
      negativePrompt: getDefaultNegativePrompt(),
      // Use SDXL for higher quality results
      model: INPAINTING_MODELS.SDXL_INPAINTING,
      // Adjust strength based on mode
      strength: mode === 'spot_removal' ? 0.8 : 0.7,
      numInferenceSteps: 30,
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
