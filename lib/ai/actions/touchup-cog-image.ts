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
    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = sourceImage.mime_type || 'image/png';

    // Get actual image dimensions using sharp
    const imageMetadata = await sharp(imageBuffer).metadata();
    const imageWidth = imageMetadata.width;
    const imageHeight = imageMetadata.height;

    if (!imageWidth || !imageHeight) {
      throw new Error('Could not determine image dimensions');
    }

    // Resize mask to match source image dimensions
    // The mask may have been created at different dimensions (e.g., 1024x1024 default)
    const maskBuffer = Buffer.from(maskBase64, 'base64');
    const maskMetadata = await sharp(maskBuffer).metadata();

    let resizedMaskBase64 = maskBase64;
    if (maskMetadata.width !== imageWidth || maskMetadata.height !== imageHeight) {
      console.log('Resizing mask:', {
        from: `${maskMetadata.width}x${maskMetadata.height}`,
        to: `${imageWidth}x${imageHeight}`,
      });

      const resizedMaskBuffer = await sharp(maskBuffer)
        .resize(imageWidth, imageHeight, {
          fit: 'fill', // Stretch to exact dimensions
          kernel: 'nearest', // Use nearest-neighbor to preserve hard edges in mask
        })
        .png()
        .toBuffer();

      resizedMaskBase64 = resizedMaskBuffer.toString('base64');
    }

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
      imageDimensions: `${imageWidth}x${imageHeight}`,
      imageSize: Math.round((imageBase64.length * 0.75) / 1024) + 'KB',
      maskSize: Math.round((resizedMaskBase64.length * 0.75) / 1024) + 'KB',
    });

    // Call the inpainting API
    const inpaintResult = await inpaintWithReplicate({
      imageBase64,
      imageMimeType,
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
