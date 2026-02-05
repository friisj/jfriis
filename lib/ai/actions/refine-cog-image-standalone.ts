'use server';

import { refineImageWithFeedback } from '../gemini-multimodal';
import { createClient } from '@/lib/supabase-server';

interface RefineImageStandaloneInput {
  /** The image ID to refine */
  imageId: string;
  /** Natural language feedback for refinement */
  feedback: string;
}

interface RefineImageStandaloneResult {
  success: boolean;
  newImageId?: string;
  imageUrl?: string;
  storagePath?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Refine an image using conversational feedback (standalone version).
 * Creates a new image record with parent_image_id pointing to the source.
 * No job context - works directly with cog_images.
 */
export async function refineCogImageStandalone(
  input: RefineImageStandaloneInput
): Promise<RefineImageStandaloneResult> {
  const { imageId, feedback } = input;
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

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = sourceImage.mime_type || 'image/png';

    // Call the refinement API (standalone - no reference images)
    const refinedResult = await refineImageWithFeedback({
      imageBase64,
      imageMimeType,
      feedback,
      originalPrompt: sourceImage.prompt || 'Image refinement',
      referenceImages: [], // Standalone mode - no reference images
    });

    // Upload the refined image
    const timestamp = Date.now();
    const filename = `refined_${timestamp}.png`;
    const storagePath = `${seriesId}/${filename}`;

    const refinedBuffer = Buffer.from(refinedResult.base64, 'base64');

    const { error: uploadError } = await supabase.storage
      .from('cog-images')
      .upload(storagePath, refinedBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload refined image: ${uploadError.message}`);
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
        parent_image_id: imageId, // Link to parent
        storage_path: storagePath,
        filename,
        mime_type: 'image/png',
        source: 'generated',
        prompt: `Refinement: ${feedback}`,
        metadata: {
          refinement: true,
          parentImageId: imageId,
          feedback,
          durationMs: refinedResult.metrics.durationMs,
        },
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create image record: ${insertError.message}`);
    }

    return {
      success: true,
      newImageId: newImage.id,
      imageUrl,
      storagePath,
      durationMs: refinedResult.metrics.durationMs,
    };
  } catch (error) {
    console.error('Standalone refinement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
