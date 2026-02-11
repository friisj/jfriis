'use server';

import { experimental_generateImage as generateImage } from 'ai';
import { getGoogle } from '../providers';
import { generateImageWithVertex, isVertexConfigured } from '../vertex-imagen';
import { generateImageWithGemini3Pro, isGemini3ProConfigured } from '../gemini-multimodal';
import { generateWithFlux, isFluxConfigured, type FluxAspectRatio, type FluxResolution } from '../replicate-flux';
import { createClient } from '@/lib/supabase-server';
import { createImage, createPipelineStepOutput, updateJob } from '@/lib/cog';
import {
  getPipelineStepsServer,
  getJobByIdServer,
  getStyleGuideByIdServer,
} from '@/lib/cog-server';
import type {
  CogPipelineStep,
  CogJob,
  CogImageModel,
  CogImageSize,
  CogAspectRatio,
  CogStyleGuide,
} from '@/lib/types/cog';

interface PipelineContext {
  styleGuidePrompt: string | null;
  initialText: string;
  initialImages: string[];
  previousOutputs: string[];
}

/**
 * Execute a pipeline job - runs all steps sequentially with auto-advance delay
 */
export async function runPipelineJob(input: { jobId: string; seriesId: string }): Promise<void> {
  const { jobId, seriesId } = input;
  const supabase = await createClient();

  try {
    // 1. Update job status to 'running'
    await updateJob(jobId, {
      status: 'running',
      started_at: new Date().toISOString(),
    });

    // 2. Fetch job and pipeline steps
    const [job, steps] = await Promise.all([
      getJobByIdServer(jobId),
      getPipelineStepsServer(jobId),
    ]);

    if (steps.length === 0) {
      throw new Error('No pipeline steps found');
    }

    // 3. Fetch style guide if set
    let styleGuide: CogStyleGuide | null = null;
    if (job.style_guide_id) {
      try {
        styleGuide = await getStyleGuideByIdServer(job.style_guide_id);
      } catch {
        console.warn('Style guide not found, continuing without it');
      }
    }

    // 4. Initialize context
    const context: PipelineContext = {
      styleGuidePrompt: styleGuide?.system_prompt || null,
      initialText: job.base_prompt,
      initialImages: job.initial_images || [],
      previousOutputs: [],
    };

    // 5. Execute steps sequentially
    for (const step of steps) {
      // Check for cancellation
      const currentJob = await getJobByIdServer(jobId);
      if (currentJob.status === 'cancelled') {
        console.log(`Job ${jobId} cancelled, stopping pipeline`);
        break;
      }

      // Update step status to 'running'
      await (supabase as any)
        .from('cog_pipeline_steps')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', step.id);

      try {
        // Execute step based on type
        const output = await executeStep(step, context, seriesId, jobId, supabase);

        // Store output
        await createPipelineStepOutput({
          step_id: step.id,
          image_id: output.imageId,
          metadata: output.metadata,
        });

        // Update context for next step
        context.previousOutputs.push(output.imageId);

        // Mark step complete
        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        // Auto-advance delay (4 seconds)
        await new Promise((resolve) => setTimeout(resolve, 4000));
      } catch (error) {
        // Mark step as failed
        await (supabase as any)
          .from('cog_pipeline_steps')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        throw error;
      }
    }

    // 6. Mark job complete
    await updateJob(jobId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pipeline job failed:', error);
    await updateJob(jobId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
}

/**
 * Execute a single pipeline step
 */
async function executeStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  switch (step.step_type) {
    case 'generate':
      return executeGenerateStep(step, context, seriesId, jobId, supabase);
    case 'refine':
      // TODO: Phase 5
      throw new Error('Refine step not yet implemented');
    case 'inpaint':
      // TODO: Phase 5
      throw new Error('Inpaint step not yet implemented');
    case 'eval':
      // TODO: Phase 5
      throw new Error('Eval step not yet implemented');
    case 'upscale':
      // TODO: Phase 5
      throw new Error('Upscale step not yet implemented');
    default:
      throw new Error(`Unknown step type: ${step.step_type}`);
  }
}

/**
 * Execute a generate step - creates new image from prompt
 */
async function executeGenerateStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  // Build the full prompt
  let fullPrompt = context.initialText;

  // Add style guide if present
  if (context.styleGuidePrompt) {
    fullPrompt = `${context.styleGuidePrompt}\n\n${fullPrompt}`;
  }

  // Add step-specific prompt if present
  const stepPrompt = step.config.prompt as string | undefined;
  if (stepPrompt) {
    fullPrompt = `${fullPrompt}\n\n${stepPrompt}`;
  }

  // Get model and settings from config
  const model = step.model as CogImageModel;
  const imageSize = (step.config.imageSize as CogImageSize) || '2K';
  const aspectRatio = (step.config.aspectRatio as CogAspectRatio) || '1:1';

  // Determine which image generation service to use
  const resolvedModel = selectImageModel(model, false, 0);

  let imageBase64: string;
  let generationMetadata: any = {
    model: resolvedModel,
    prompt: fullPrompt,
    size: imageSize,
    aspectRatio,
  };

  // Generate image based on model
  if (resolvedModel === 'gemini-3-pro-image' && isGemini3ProConfigured()) {
    const result = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      aspectRatio,
      imageSize,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'gemini-3-pro';
  } else if (
    (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') &&
    isFluxConfigured()
  ) {
    const fluxAspectRatio = mapAspectRatioToFlux(aspectRatio);
    const fluxResolution = mapSizeToFluxResolution(imageSize, resolvedModel);
    const result = await generateWithFlux({
      prompt: fullPrompt,
      model: resolvedModel,
      aspectRatio: fluxAspectRatio,
      resolution: fluxResolution,
    });
    imageBase64 = result.buffer.toString('base64');
    generationMetadata.provider = 'replicate-flux';
  } else if (resolvedModel === 'imagen-3-capability' && isVertexConfigured()) {
    const result = await generateImageWithVertex({
      prompt: fullPrompt,
      aspectRatio,
    });
    imageBase64 = result.base64;
    generationMetadata.provider = 'vertex-imagen';
  } else {
    // Default to Imagen 4
    const google = getGoogle();
    const { image } = await generateImage({
      model: google.image('imagen-3.0-generate-002'),
      prompt: fullPrompt,
      aspectRatio,
    });
    imageBase64 = image.base64;
    generationMetadata.provider = 'google-imagen';
  }

  // Convert base64 to buffer
  const imageData = Buffer.from(imageBase64, 'base64');
  const filename = `pipeline-${jobId}-step-${step.step_order}-${Date.now()}.png`;
  const storagePath = `${seriesId}/${filename}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, imageData, {
      contentType: 'image/png',
    });

  if (uploadError) throw uploadError;

  // Create image record
  const image = await createImage({
    series_id: seriesId,
    job_id: jobId,
    storage_path: storagePath,
    filename,
    mime_type: 'image/png',
    source: 'generated',
    prompt: fullPrompt,
    metadata: generationMetadata,
  });

  return {
    imageId: image.id,
    metadata: generationMetadata,
  };
}

/**
 * Select image model (simplified for pipeline - no reference images in generate step)
 */
function selectImageModel(
  jobModel: CogImageModel,
  hasReferenceImages: boolean,
  referenceCount: number = 0
): 'imagen-4' | 'imagen-3-capability' | 'gemini-3-pro-image' | 'flux-2-pro' | 'flux-2-dev' {
  if (jobModel !== 'auto') {
    return jobModel;
  }

  // For pipeline, default to Flux or Gemini if available
  if (isFluxConfigured()) {
    return 'flux-2-dev';
  }

  if (isGemini3ProConfigured()) {
    return 'gemini-3-pro-image';
  }

  return 'imagen-4';
}

/**
 * Map aspect ratio to Flux format
 */
function mapAspectRatioToFlux(ratio: CogAspectRatio): FluxAspectRatio {
  const supported: FluxAspectRatio[] = [
    '1:1',
    '16:9',
    '3:2',
    '2:3',
    '4:5',
    '5:4',
    '9:16',
    '3:4',
    '4:3',
    '21:9',
  ];
  if (supported.includes(ratio as FluxAspectRatio)) {
    return ratio as FluxAspectRatio;
  }
  return '1:1';
}

/**
 * Map size to Flux resolution
 */
function mapSizeToFluxResolution(
  size: CogImageSize,
  model: 'flux-2-pro' | 'flux-2-dev'
): FluxResolution {
  const maxRes = model === 'flux-2-pro' ? 4 : 2;

  switch (size) {
    case '1K':
      return '1';
    case '2K':
      return '2';
    case '4K':
      return maxRes === 4 ? '4' : '2';
    default:
      return '1';
  }
}
