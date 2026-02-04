'use server';

import { refineImageWithFeedback } from '../gemini-multimodal';
import { createClient } from '@/lib/supabase-server';

interface RefineImageInput {
  /** The step ID containing the image to refine */
  stepId: string;
  /** Natural language feedback for refinement */
  feedback: string;
}

interface RefinementHistoryEntry {
  feedback: string;
  imageUrl: string;
  storagePath: string;
  durationMs: number;
  timestamp: string;
}

interface RefineImageResult {
  success: boolean;
  imageUrl?: string;
  storagePath?: string;
  durationMs?: number;
  error?: string;
}

/**
 * Refine a generated image using conversational feedback.
 * Fetches the current image, sends to Gemini with feedback,
 * uploads the refined image, and updates the step output.
 */
export async function refineCogImage(input: RefineImageInput): Promise<RefineImageResult> {
  const { stepId, feedback } = input;
  const supabase = await createClient();

  try {
    // Fetch the step with its output
    const { data: step, error: stepError } = await (supabase as any)
      .from('cog_job_steps')
      .select('*, job:cog_jobs(*)')
      .eq('id', stepId)
      .single();

    if (stepError) {
      throw new Error(`Failed to fetch step: ${stepError.message}`);
    }

    if (!step.output?.storagePath) {
      throw new Error('Step has no generated image to refine');
    }

    const job = step.job;
    const seriesId = job.series_id;

    // Download the current image
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('cog-images')
      .download(step.output.storagePath);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    const imageBuffer = await imageData.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString('base64');
    const imageMimeType = 'image/png'; // Assuming PNG from our generation

    // Optionally fetch reference images for consistency
    const referenceImages: Array<{ base64: string; mimeType: string }> = [];

    const { data: inputs } = await (supabase as any)
      .from('cog_job_inputs')
      .select('*, image:cog_images(*)')
      .eq('job_id', job.id)
      .order('reference_id', { ascending: true });

    if (inputs?.length > 0) {
      for (const input of inputs) {
        if (input.image?.storage_path) {
          const { data: refData } = await supabase.storage
            .from('cog-images')
            .download(input.image.storage_path);

          if (refData) {
            const refBuffer = await refData.arrayBuffer();
            referenceImages.push({
              base64: Buffer.from(refBuffer).toString('base64'),
              mimeType: input.image.mime_type || 'image/png',
            });
          }
        }
      }
    }

    // Call the refinement API
    const refinedResult = await refineImageWithFeedback({
      imageBase64,
      imageMimeType,
      feedback,
      originalPrompt: step.output.prompt || step.prompt,
      referenceImages,
    });

    // Upload the refined image
    const timestamp = Date.now();
    const filename = `${job.id}_step${step.sequence}_refined_${timestamp}.png`;
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

    // Create image record
    await (supabase as any)
      .from('cog_images')
      .insert({
        series_id: seriesId,
        job_id: job.id,
        storage_path: storagePath,
        filename,
        source: 'generated',
        prompt: `Refinement: ${feedback}`,
        metadata: {
          refinement: true,
          originalStepId: stepId,
          originalStoragePath: step.output.storagePath,
          feedback,
          durationMs: refinedResult.metrics.durationMs,
        },
      });

    // Update step output with refinement history
    const existingHistory: RefinementHistoryEntry[] = step.output.refinementHistory || [];
    const newHistory: RefinementHistoryEntry[] = [
      ...existingHistory,
      {
        feedback,
        imageUrl,
        storagePath,
        durationMs: refinedResult.metrics.durationMs,
        timestamp: new Date().toISOString(),
      },
    ];

    await (supabase as any)
      .from('cog_job_steps')
      .update({
        output: {
          ...step.output,
          // Update current image to the refined version
          imageUrl,
          storagePath,
          // Keep history of refinements
          refinementHistory: newHistory,
        },
      })
      .eq('id', stepId);

    return {
      success: true,
      imageUrl,
      storagePath,
      durationMs: refinedResult.metrics.durationMs,
    };

  } catch (error) {
    console.error('Refinement error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
