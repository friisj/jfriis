'use server';

import { generateText, experimental_generateImage as generateImage } from 'ai';
import { getModel } from '../models';
import { getGoogle } from '../providers';
import { createClient } from '@/lib/supabase-server';
import type { CogJobStep } from '@/lib/types/cog';

interface RunJobInput {
  jobId: string;
  seriesId: string;
}

/**
 * Count reference images for a job
 * NOTE: Actual image references require Vertex AI (imagen-3.0-capability-001)
 * which isn't available through the Gemini API. For now we just track the count.
 */
async function countReferenceImages(
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { count, error } = await (supabase as any)
    .from('cog_job_inputs')
    .select('*', { count: 'exact', head: true })
    .eq('job_id', jobId);

  if (error) {
    console.error('Failed to count job inputs:', error);
    return 0;
  }

  return count || 0;
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

  // Count reference images (context only - actual references require Vertex AI)
  const referenceCount = await countReferenceImages(jobId, supabase);

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

          // Generate image using Google's Imagen 4
          // NOTE: Reference images (imagen-3.0-capability-001) require Vertex AI which isn't
          // available through the Gemini API. For now, we use Imagen 4 text-to-image only.
          // The reference image context is included in the prompt but actual image references
          // would require Vertex AI integration.
          const google = getGoogle();
          const modelId = 'imagen-4.0-generate-001';

          const { image } = await generateImage({
            model: google.image(modelId),
            prompt: promptToUse,
            aspectRatio: '1:1',
          });

          // Get base64 data and convert to buffer
          const base64Data = image.base64;
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
          // Note: reference_images_requested tracks what was selected, but actual image
          // references require Vertex AI (not available through Gemini API)
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
                reference_images_requested: referenceCount,
                references_note: referenceCount > 0
                  ? 'Reference context included in prompt only. Actual image references require Vertex AI.'
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
