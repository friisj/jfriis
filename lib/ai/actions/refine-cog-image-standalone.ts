'use server';

import { refineImageWithFeedback } from '../gemini-multimodal';
import { generateWithFlux, type FluxModel } from '../replicate-flux';
import { createClient } from '@/lib/supabase-server';

type RefinementModel = 'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev';

interface RefineImageStandaloneInput {
  /** The image ID to refine */
  imageId: string;
  /** Natural language feedback for refinement */
  feedback: string;
  /** Model to use for refinement */
  model?: RefinementModel;
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
  const { imageId, feedback, model = 'gemini-3-pro' } = input;
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

    let refinedBuffer: Buffer;
    let durationMs: number;

    console.log('Refinement request:', { model, feedback: feedback.slice(0, 50) });

    if (model === 'gemini-3-pro') {
      // Gemini: Conversational refinement with current image as context
      const refinedResult = await refineImageWithFeedback({
        imageBase64,
        imageMimeType,
        feedback,
        originalPrompt: sourceImage.prompt || 'Image refinement',
        referenceImages: [], // Standalone mode - no reference images
      });
      refinedBuffer = Buffer.from(refinedResult.base64, 'base64');
      durationMs = refinedResult.metrics.durationMs;
    } else {
      // Flux: Use current image as reference, feedback as prompt
      const fluxModel: FluxModel = model === 'flux-2-pro' ? 'flux-2-pro' : 'flux-2-dev';

      // Build a prompt that incorporates the feedback and context
      const refinementPrompt = sourceImage.prompt
        ? `${feedback}. Based on original: ${sourceImage.prompt}`
        : feedback;

      const fluxResult = await generateWithFlux({
        prompt: refinementPrompt,
        referenceImages: [{ base64: imageBase64, mimeType: imageMimeType }],
        model: fluxModel,
        aspectRatio: '1:1', // Could be derived from image dimensions
      });
      refinedBuffer = fluxResult.buffer;
      durationMs = fluxResult.durationMs;
    }

    // Upload the refined image
    const timestamp = Date.now();
    const filename = `refined_${timestamp}.png`;
    const storagePath = `${seriesId}/${filename}`;

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
          model,
          durationMs,
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
      durationMs,
    };
  } catch (error) {
    console.error('Standalone refinement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
