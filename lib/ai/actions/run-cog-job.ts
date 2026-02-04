'use server';

import { generateText, experimental_generateImage as generateImage } from 'ai';
import { getModel } from '../models';
import { getGoogle } from '../providers';
import { generateImageWithVertex, isVertexConfigured } from '../vertex-imagen';
import { createClient } from '@/lib/supabase-server';
import type { CogJobStep } from '@/lib/types/cog';

interface RunJobInput {
  jobId: string;
  seriesId: string;
}

interface ReferenceImageData {
  base64: string;
  mimeType: string;
}

/**
 * Fetch reference images for a job from Supabase storage.
 * Returns array of base64-encoded images ready for Vertex AI.
 */
async function fetchReferenceImages(
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ReferenceImageData[]> {
  // Get job inputs with their associated images
  const { data: inputs, error } = await (supabase as any)
    .from('cog_job_inputs')
    .select('*, image:cog_images(*)')
    .eq('job_id', jobId)
    .order('reference_id', { ascending: true });

  if (error) {
    console.error('Failed to fetch job inputs:', error);
    return [];
  }

  if (!inputs?.length) {
    return [];
  }

  // Download each image and convert to base64
  const referenceImages: ReferenceImageData[] = [];

  for (const input of inputs) {
    if (!input.image?.storage_path) {
      console.warn(`Job input ${input.id} has no associated image storage path`);
      continue;
    }

    const { data, error: downloadError } = await supabase.storage
      .from('cog-images')
      .download(input.image.storage_path);

    if (downloadError) {
      console.error(
        `Failed to download image ${input.image.storage_path}:`,
        downloadError
      );
      continue;
    }

    const buffer = await data.arrayBuffer();
    referenceImages.push({
      base64: Buffer.from(buffer).toString('base64'),
      mimeType: 'image/png',
    });
  }

  return referenceImages;
}

export async function runCogJob(input: RunJobInput): Promise<void> {
  const { jobId, seriesId } = input;
  const supabase = await createClient();

  // Update job status to running
  const { error: updateError } = await (supabase as any)
    .from('cog_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (updateError) {
    throw new Error(`Failed to update job status: ${updateError.message}`);
  }

  // Fetch reference images for potential Vertex AI usage
  const referenceImages = await fetchReferenceImages(jobId, supabase);
  const referenceCount = referenceImages.length;
  const useVertexAI = referenceCount > 0 && isVertexConfigured();

  // Get all steps for this job
  const { data: steps, error: stepsError } = await (supabase as any)
    .from('cog_job_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('sequence', { ascending: true });

  if (stepsError) {
    throw new Error(`Failed to fetch steps: ${stepsError.message}`);
  }

  let previousOutput: string | null = null;

  try {
    for (const step of steps as CogJobStep[]) {
      // Update step status to running
      await (supabase as any)
        .from('cog_job_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', step.id);

      try {
        if (step.step_type === 'llm') {
          // Run LLM step
          const stepPrompt: string = previousOutput
            ? `${step.prompt}\n\nContext from previous step:\n${previousOutput}`
            : step.prompt;

          const model = getModel('gemini-flash');
          const result = await generateText({
            model,
            prompt: stepPrompt,
          });

          previousOutput = result.text;

          // Update step with output
          await (supabase as any)
            .from('cog_job_steps')
            .update({
              status: 'completed',
              output: { text: result.text },
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);

        } else if (step.step_type === 'image_gen') {
          // Use the refined prompt from the previous LLM step, or fall back to the step's prompt
          const promptToUse = previousOutput || step.prompt;

          // Generate image - route to Vertex AI if reference images and configured
          let imageResult: { base64: string; mimeType: string };
          let modelId: string;

          if (useVertexAI) {
            // Use Vertex AI with Imagen 3 Capability model for subject customization
            modelId = 'imagen-3.0-capability-001';
            imageResult = await generateImageWithVertex({
              prompt: promptToUse,
              referenceImages,
              aspectRatio: '1:1',
            });
          } else {
            // Use Gemini API with Imagen 4 (text-to-image only)
            modelId = 'imagen-4.0-generate-001';
            const google = getGoogle();
            const { image } = await generateImage({
              model: google.image(modelId),
              prompt: promptToUse,
              aspectRatio: '1:1',
            });
            imageResult = { base64: image.base64, mimeType: 'image/png' };
          }

          // Get base64 data and convert to buffer
          const base64Data = imageResult.base64;
          const imageBuffer = Buffer.from(base64Data, 'base64');

          // Generate a unique filename
          const timestamp = Date.now();
          const filename = `${jobId}_step${step.sequence}_${timestamp}.png`;
          const storagePath = `${seriesId}/${filename}`;

          // Upload to Supabase storage
          const { error: uploadError } = await supabase.storage
            .from('cog-images')
            .upload(storagePath, imageBuffer, {
              contentType: 'image/png',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`Failed to upload image: ${uploadError.message}`);
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('cog-images')
            .getPublicUrl(storagePath);

          const imageUrl = urlData.publicUrl;

          // Create a cog_images record
          const { data: imageRecord, error: imageError } = await (supabase as any)
            .from('cog_images')
            .insert({
              series_id: seriesId,
              job_id: jobId,
              storage_path: storagePath,
              filename,
              source: 'generated',
              prompt: promptToUse,
              metadata: {
                generation_model: modelId,
                step_id: step.id,
                step_sequence: step.sequence,
                reference_images_used: referenceCount,
                used_vertex_ai: useVertexAI,
                references_note:
                  referenceCount > 0 && !useVertexAI
                    ? 'Reference context included in prompt only. Configure Vertex AI to use actual image references.'
                    : undefined,
              },
            })
            .select()
            .single();

          if (imageError) {
            throw new Error(`Failed to create image record: ${imageError.message}`);
          }

          // Update step with output
          await (supabase as any)
            .from('cog_job_steps')
            .update({
              status: 'completed',
              output: {
                prompt: promptToUse,
                model: modelId,
                imageUrl,
                imageId: imageRecord.id,
                storagePath,
              },
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);

          // Reset previous output for next image pair
          previousOutput = null;
        }
      } catch (stepError) {
        // Update step with error
        await (supabase as any)
          .from('cog_job_steps')
          .update({
            status: 'failed',
            error_message: stepError instanceof Error ? stepError.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        // Mark job as failed
        await (supabase as any)
          .from('cog_jobs')
          .update({
            status: 'failed',
            error_message: `Step ${step.sequence} failed: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        throw stepError;
      }
    }

    // Mark job as completed
    await (supabase as any)
      .from('cog_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

  } catch (error) {
    // Job failure already handled in the step loop
    throw error;
  }
}
