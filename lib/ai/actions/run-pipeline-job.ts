'use server';

import { experimental_generateImage as generateImage, generateText } from 'ai';
import { getGoogle } from '../providers';
import { getModel } from '../models';
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
      return executeRefineStep(step, context, seriesId, jobId, supabase);
    case 'eval':
      return executeEvalStep(step, context, seriesId, jobId, supabase);
    case 'inpaint':
      return executeInpaintStep(step, context, seriesId, jobId, supabase);
    case 'upscale':
      return executeUpscaleStep(step, context, seriesId, jobId, supabase);
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
 * Execute a refine step - modifies previous output using it as reference
 */
async function executeRefineStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  // Get the most recent output image
  if (context.previousOutputs.length === 0) {
    throw new Error('Refine step requires a previous output image');
  }

  const previousImageId = context.previousOutputs[context.previousOutputs.length - 1];

  // Fetch the previous image from storage
  const { data: previousImage } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .eq('id', previousImageId)
    .single();

  if (!previousImage) {
    throw new Error(`Previous image ${previousImageId} not found`);
  }

  // Download image from storage
  const { data: imageBlob, error: downloadError } = await supabase.storage
    .from('cog-images')
    .download(previousImage.storage_path);

  if (downloadError) throw downloadError;

  // Convert to base64
  const arrayBuffer = await imageBlob.arrayBuffer();
  const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

  // Build refinement prompt
  let fullPrompt = context.initialText;
  if (context.styleGuidePrompt) {
    fullPrompt = `${context.styleGuidePrompt}\n\n${fullPrompt}`;
  }

  const refinementPrompt = step.config.refinementPrompt as string;
  if (refinementPrompt) {
    fullPrompt = `${fullPrompt}\n\nRefinement instructions: ${refinementPrompt}`;
  }

  // Get settings
  const model = step.model as CogImageModel;
  const imageSize = (step.config.imageSize as CogImageSize) || '2K';
  const aspectRatio = (step.config.aspectRatio as CogAspectRatio) || '1:1';

  // Generate refined image using reference
  const resolvedModel = selectImageModel(model, true, 1);
  let imageResult: string;
  let generationMetadata: any = {
    model: resolvedModel,
    prompt: fullPrompt,
    size: imageSize,
    aspectRatio,
    refinedFrom: previousImageId,
  };

  // Use models that support reference images
  if (resolvedModel === 'gemini-3-pro-image' && isGemini3ProConfigured()) {
    const result = await generateImageWithGemini3Pro({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      aspectRatio,
      imageSize,
    });
    imageResult = result.base64;
    generationMetadata.provider = 'gemini-3-pro';
  } else if (
    (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') &&
    isFluxConfigured()
  ) {
    const fluxAspectRatio = mapAspectRatioToFlux(aspectRatio);
    const fluxResolution = mapSizeToFluxResolution(imageSize, resolvedModel);
    const result = await generateWithFlux({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      model: resolvedModel,
      aspectRatio: fluxAspectRatio,
      resolution: fluxResolution,
    });
    imageResult = result.buffer.toString('base64');
    generationMetadata.provider = 'replicate-flux';
  } else if (resolvedModel === 'imagen-3-capability' && isVertexConfigured()) {
    const result = await generateImageWithVertex({
      prompt: fullPrompt,
      referenceImages: [{ base64: imageBase64, mimeType: 'image/png' }],
      aspectRatio,
    });
    imageResult = result.base64;
    generationMetadata.provider = 'vertex-imagen';
  } else {
    throw new Error('Refine step requires a model that supports reference images (Gemini 3 Pro, Flux, or Imagen 3)');
  }

  // Store refined image
  const imageData = Buffer.from(imageResult, 'base64');
  const filename = `pipeline-${jobId}-step-${step.step_order}-${Date.now()}.png`;
  const storagePath = `${seriesId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('cog-images')
    .upload(storagePath, imageData, { contentType: 'image/png' });

  if (uploadError) throw uploadError;

  const image = await createImage({
    series_id: seriesId,
    job_id: jobId,
    parent_image_id: previousImageId,
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
 * Execute an eval step - evaluates previous outputs and selects winner
 */
async function executeEvalStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  // For now, assume we evaluate the last output
  // In a more advanced implementation, this could evaluate multiple candidates
  if (context.previousOutputs.length === 0) {
    throw new Error('Eval step requires at least one previous output');
  }

  const candidateIds = context.previousOutputs.slice(-3); // Evaluate last 3 outputs
  const evalCriteria = (step.config.evalCriteria as string) || 'overall quality and adherence to prompt';

  // Fetch candidate images
  const { data: candidates } = await (supabase as any)
    .from('cog_images')
    .select('*')
    .in('id', candidateIds);

  if (!candidates || candidates.length === 0) {
    throw new Error('No candidate images found for evaluation');
  }

  // Download and score each candidate
  const scores: { imageId: string; score: number; reasoning: string }[] = [];

  for (const candidate of candidates) {
    // Download image
    const { data: imageBlob } = await supabase.storage
      .from('cog-images')
      .download(candidate.storage_path);

    if (!imageBlob) continue;

    const arrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = Buffer.from(arrayBuffer).toString('base64');

    // Use LLM to evaluate
    const model = getModel('gemini-flash');
    const result = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:image/png;base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: `Evaluate this image based on the following criteria: ${evalCriteria}\n\nProvide a score from 1-10 and brief reasoning. Format: SCORE: X\nREASONING: ...`,
            },
          ],
        },
      ],
    });

    // Parse score
    const scoreMatch = result.text.match(/SCORE:\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 5;
    const reasoning = result.text.replace(/SCORE:\s*\d+/i, '').trim();

    scores.push({
      imageId: candidate.id,
      score,
      reasoning,
    });
  }

  // Select winner (highest score)
  const winner = scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );

  return {
    imageId: winner.imageId,
    metadata: {
      evalCriteria,
      scores,
      winner: winner.imageId,
    },
  };
}

/**
 * Execute an inpaint step - applies mask and fills region
 */
async function executeInpaintStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  // Get previous image
  if (context.previousOutputs.length === 0) {
    throw new Error('Inpaint step requires a previous output image');
  }

  const previousImageId = context.previousOutputs[context.previousOutputs.length - 1];

  // Note: Inpainting requires specialized APIs that may not be available
  // This is a stub implementation that explains the limitation
  throw new Error(
    'Inpaint step requires inpainting API integration (e.g., Vertex Imagen EditImage). ' +
    'This feature is not yet implemented. ' +
    'As a workaround, use the Refine step with detailed instructions about what to change.'
  );
}

/**
 * Execute an upscale step - increases image resolution
 */
async function executeUpscaleStep(
  step: CogPipelineStep,
  context: PipelineContext,
  seriesId: string,
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ imageId: string; metadata: any }> {
  // Get previous image
  if (context.previousOutputs.length === 0) {
    throw new Error('Upscale step requires a previous output image');
  }

  const previousImageId = context.previousOutputs[context.previousOutputs.length - 1];

  // Note: Upscaling requires specialized APIs (e.g., Replicate Real-ESRGAN)
  // This is a stub implementation that explains the limitation
  throw new Error(
    'Upscale step requires upscaling API integration (e.g., Replicate Real-ESRGAN). ' +
    'This feature is not yet implemented. ' +
    'As a workaround, use image size settings in Generate or Refine steps to control resolution.'
  );
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
