'use server';

import { experimental_generateImage as generateImage } from 'ai';
import { getGoogle } from '../providers';
import { generateImageWithVertex, isVertexConfigured } from '../vertex-imagen';
import { generateImageWithGemini3Pro, isGemini3ProConfigured } from '../gemini-multimodal';
import { generateWithFlux, isFluxConfigured, type FluxAspectRatio, type FluxResolution } from '../replicate-flux';
import { createClient } from '@/lib/supabase-server';
import type { CogImageModel, CogImageSize, CogAspectRatio } from '@/lib/types/cog';

interface RetryStepInput {
  stepId: string;
}

interface RetryStepResult {
  success: boolean;
  error?: string;
}

interface ReferenceImageData {
  base64: string;
  mimeType: string;
}

type ResolvedImageModel = 'imagen-4' | 'imagen-3-capability' | 'gemini-3-pro-image' | 'flux-2-pro' | 'flux-2-dev';

function selectImageModel(
  jobModel: CogImageModel,
  hasReferenceImages: boolean,
  referenceCount: number = 0
): ResolvedImageModel {
  if (jobModel !== 'auto') {
    return jobModel;
  }

  if (!hasReferenceImages) {
    return 'imagen-4';
  }

  // Prefer Flux for reference-based generation
  if (isFluxConfigured()) {
    return referenceCount > 5 ? 'flux-2-pro' : 'flux-2-dev';
  }

  if (isGemini3ProConfigured()) {
    return 'gemini-3-pro-image';
  }

  if (isVertexConfigured()) {
    return 'imagen-3-capability';
  }

  return 'imagen-4';
}

function mapAspectRatioToFlux(ratio: CogAspectRatio): FluxAspectRatio {
  const supported: FluxAspectRatio[] = ['1:1', '16:9', '3:2', '2:3', '4:5', '5:4', '9:16', '3:4', '4:3', '21:9'];
  if (supported.includes(ratio as FluxAspectRatio)) {
    return ratio as FluxAspectRatio;
  }
  return '1:1';
}

function mapSizeToFluxResolution(size: CogImageSize, model: 'flux-2-pro' | 'flux-2-dev'): FluxResolution {
  const maxRes = model === 'flux-2-pro' ? 4 : 2;
  switch (size) {
    case '1K': return '1';
    case '2K': return '2';
    case '4K': return maxRes === 4 ? '4' : '2';
    default: return '1';
  }
}

async function fetchReferenceImages(
  jobId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ReferenceImageData[]> {
  const { data: inputs, error } = await (supabase as any)
    .from('cog_job_inputs')
    .select('*, image:cog_images(*)')
    .eq('job_id', jobId)
    .order('reference_id', { ascending: true });

  if (error || !inputs?.length) {
    return [];
  }

  const referenceImages: ReferenceImageData[] = [];

  for (const input of inputs) {
    if (!input.image?.storage_path) continue;

    const { data, error: downloadError } = await supabase.storage
      .from('cog-images')
      .download(input.image.storage_path);

    if (downloadError) continue;

    const arrayBuffer = await data.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = data.type || 'image/png';

    referenceImages.push({ base64, mimeType });
  }

  return referenceImages;
}

function getImagenDimensions(
  imageSize: CogImageSize,
  aspectRatio: CogAspectRatio
): { width: number; height: number } {
  const baseSize = imageSize === '1K' ? 1024 : imageSize === '2K' ? 2048 : 4096;
  const [w, h] = aspectRatio.split(':').map(Number);
  const ratio = w / h;

  if (ratio >= 1) {
    return { width: baseSize, height: Math.round(baseSize / ratio) };
  } else {
    return { width: Math.round(baseSize * ratio), height: baseSize };
  }
}

/**
 * Retry a completed or failed step by regenerating with the SAME prompt and settings.
 * Does NOT redo thinking/vision analysis - just generates a fresh image.
 */
export async function retryCogStep({ stepId }: RetryStepInput): Promise<RetryStepResult> {
  const supabase = await createClient();

  try {
    // Get the step with its job details
    const { data: step, error: stepError } = await (supabase as any)
      .from('cog_job_steps')
      .select('*, job:cog_jobs(*)')
      .eq('id', stepId)
      .single();

    if (stepError || !step) {
      return { success: false, error: 'Step not found' };
    }

    const job = step.job;
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    // Only allow retry on completed or failed steps
    if (step.status !== 'completed' && step.status !== 'failed') {
      return { success: false, error: 'Can only retry completed or failed steps' };
    }

    // Only support image_gen steps
    if (step.step_type !== 'image_gen') {
      return { success: false, error: 'Can only retry image generation steps' };
    }

    // Use the SAME prompt that was used originally
    // This is already the final prompt (with any thinking analysis baked in from the original run)
    const promptToUse = step.prompt || 'Generate an image';

    // Mark step as running
    await (supabase as any)
      .from('cog_job_steps')
      .update({
        status: 'running',
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: null,
      })
      .eq('id', stepId);

    // Fetch reference images (needed for Gemini/Vertex/Flux models)
    const referenceImages = await fetchReferenceImages(job.id, supabase);
    const hasReferenceImages = referenceImages.length > 0;

    // Use the same model selection as the original job
    const resolvedModel = selectImageModel(job.image_model || 'auto', hasReferenceImages, referenceImages.length);
    const imageSize: CogImageSize = job.image_size || '2K';
    const aspectRatio: CogAspectRatio = job.aspect_ratio || '1:1';
    const { width, height } = getImagenDimensions(imageSize, aspectRatio);

    let newImageUrl: string;
    let newStoragePath: string;

    // Generate based on model - same logic as original, but NO thinking analysis
    if (resolvedModel === 'flux-2-pro' || resolvedModel === 'flux-2-dev') {
      const fluxResult = await generateWithFlux({
        prompt: promptToUse,
        referenceImages: referenceImages.map(ref => ({
          base64: ref.base64,
          mimeType: ref.mimeType,
        })),
        aspectRatio: mapAspectRatioToFlux(aspectRatio),
        resolution: mapSizeToFluxResolution(imageSize, resolvedModel),
        model: resolvedModel,
      });

      const filename = `retry-${Date.now()}.png`;
      newStoragePath = `series/${job.series_id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(newStoragePath, fluxResult.buffer, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cog-images')
        .getPublicUrl(newStoragePath);

      newImageUrl = urlData.publicUrl;

    } else if (resolvedModel === 'gemini-3-pro-image') {
      const result = await generateImageWithGemini3Pro({
        prompt: promptToUse,
        referenceImages: referenceImages,
        aspectRatio,
      });

      const imageBuffer = Buffer.from(result.base64, 'base64');
      const filename = `retry-${Date.now()}.png`;
      newStoragePath = `series/${job.series_id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(newStoragePath, imageBuffer, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cog-images')
        .getPublicUrl(newStoragePath);

      newImageUrl = urlData.publicUrl;

    } else if (resolvedModel === 'imagen-3-capability' && hasReferenceImages) {
      const result = await generateImageWithVertex({
        prompt: promptToUse,
        referenceImages: referenceImages.slice(0, 4),
        aspectRatio,
      });

      const imageBuffer = Buffer.from(result.base64, 'base64');
      const filename = `retry-${Date.now()}.png`;
      newStoragePath = `series/${job.series_id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(newStoragePath, imageBuffer, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cog-images')
        .getPublicUrl(newStoragePath);

      newImageUrl = urlData.publicUrl;

    } else {
      // Imagen 4 (text-only)
      const google = getGoogle();
      const result = await generateImage({
        model: google.image('imagen-4-ultra'),
        prompt: promptToUse,
        size: `${width}x${height}`,
        providerOptions: {
          google: { aspectRatio },
        },
      });

      const imageBuffer = Buffer.from(result.image.base64, 'base64');
      const filename = `retry-${Date.now()}.png`;
      newStoragePath = `series/${job.series_id}/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from('cog-images')
        .upload(newStoragePath, imageBuffer, { contentType: 'image/png' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('cog-images')
        .getPublicUrl(newStoragePath);

      newImageUrl = urlData.publicUrl;
    }

    // Preserve existing output data (thinkingChain, refinementHistory, etc.)
    const existingOutput = (step.output as Record<string, unknown>) || {};
    const { imageUrl: _oldUrl, storagePath: _oldPath, ...preservedData } = existingOutput;

    // Update step with new image, preserving metadata
    await (supabase as any)
      .from('cog_job_steps')
      .update({
        status: 'completed',
        output: {
          ...preservedData,
          imageUrl: newImageUrl,
          storagePath: newStoragePath,
          retriedAt: new Date().toISOString(),
        },
        completed_at: new Date().toISOString(),
      })
      .eq('id', stepId);

    // Create cog_images record for the new image
    await (supabase as any).from('cog_images').insert({
      series_id: job.series_id,
      job_id: job.id,
      storage_path: newStoragePath,
      filename: `retry-${Date.now()}.png`,
      source: 'generated',
      prompt: promptToUse,
    });

    return { success: true };

  } catch (error) {
    console.error('Retry step error:', error);

    // Mark step as failed
    await (supabase as any)
      .from('cog_job_steps')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', stepId);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
