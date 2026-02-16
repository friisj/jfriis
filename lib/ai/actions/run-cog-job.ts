'use server';

import { generateText, experimental_generateImage as generateImage } from 'ai';
import { getModel } from '../models';
import { getGoogle } from '../providers';
import { generateImageWithVertex, isVertexConfigured } from '../vertex-imagen';
import { generateImageWithGemini3Pro, isGemini3ProConfigured, analyzeReferenceImages, type VisionAnalysisResult } from '../gemini-multimodal';
import { generateWithFlux, isFluxConfigured, type FluxAspectRatio, type FluxResolution } from '../replicate-flux';
import { createClient } from '@/lib/supabase-server';
import type { CogJobStep, CogImageModel, CogImageSize, CogAspectRatio } from '@/lib/types/cog';
import { generateThumbnails } from '@/lib/cog-thumbnails';
import { clampReferencesForModel, type ReferenceCapModel } from '@/lib/reference-images';

type ResolvedImageModel = ReferenceCapModel;

/**
 * Select the appropriate image generation model based on job settings and capabilities.
 * Auto mode intelligently picks based on reference images and configured APIs.
 */
function selectImageModel(
  jobModel: CogImageModel,
  hasReferenceImages: boolean,
  referenceCount: number = 0
): ResolvedImageModel {
  // Manual override - use specified model
  if (jobModel !== 'auto') {
    return jobModel;
  }

  // Auto selection logic:
  // 1. No reference images → Imagen 4 (best quality text-to-image)
  // 2. Has refs (1-5) + Flux configured → Flux 2 Dev (fast, good quality)
  // 3. Has refs (6-8) + Flux configured → Flux 2 Pro (more refs, higher quality)
  // 4. Has refs + Gemini 3 Pro configured → Gemini 3 Pro (up to 14 refs, 4K)
  // 5. Has refs + Vertex configured → Imagen 3 Capability (up to 4 refs)
  // 6. Has refs, none configured → Imagen 4 (refs ignored)
  if (!hasReferenceImages) {
    return 'imagen-4';
  }

  // Prefer Flux for reference-based generation when configured
  if (isFluxConfigured()) {
    // Use Pro for 6-8 refs (Dev max is 5)
    if (referenceCount > 5) {
      return 'flux-2-pro';
    }
    // Use Dev for 1-5 refs (faster, cheaper)
    return 'flux-2-dev';
  }

  if (isGemini3ProConfigured()) {
    return 'gemini-3-pro-image';
  }

  if (isVertexConfigured()) {
    return 'imagen-3-capability';
  }

  // Fallback - reference images won't be used
  console.warn('Reference images provided but no supporting API configured. Using Imagen 4 (refs will be ignored).');
  return 'imagen-4';
}

/**
 * Map Cog aspect ratio to Flux aspect ratio.
 * Flux supports: 1:1, 16:9, 3:2, 2:3, 4:5, 5:4, 9:16, 3:4, 4:3, 21:9
 */
function mapAspectRatioToFlux(ratio: CogAspectRatio): FluxAspectRatio {
  // Direct mapping for supported ratios
  const supported: FluxAspectRatio[] = ['1:1', '16:9', '3:2', '2:3', '4:5', '5:4', '9:16', '3:4', '4:3', '21:9'];
  if (supported.includes(ratio as FluxAspectRatio)) {
    return ratio as FluxAspectRatio;
  }
  // Fallback to 1:1 for unsupported ratios
  console.warn(`Aspect ratio ${ratio} not directly supported by Flux, using 1:1`);
  return '1:1';
}

/**
 * Map Cog image size to Flux resolution in megapixels.
 */
function mapSizeToFluxResolution(size: CogImageSize, model: 'flux-2-pro' | 'flux-2-dev'): FluxResolution {
  const maxRes = model === 'flux-2-pro' ? 4 : 2;

  switch (size) {
    case '1K':
      return '1';
    case '2K':
      return '2';
    case '4K':
      // Flux Dev max is 2MP
      return maxRes === 4 ? '4' : '2';
    default:
      return '1';
  }
}

interface RunJobInput {
  jobId: string;
  seriesId: string;
}

interface ReferenceImageData {
  base64: string;
  mimeType: string;
  subjectDescription?: string;
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
      mimeType: input.image.mime_type || 'image/png',
      // Pass through the context as subject description
      subjectDescription: input.context || undefined,
    });

    console.log(`Loaded reference image ${input.reference_id}: ${input.image.filename} (${input.image.mime_type}, ${Math.round(buffer.byteLength / 1024)}KB)`);
  }

  return referenceImages;
}

export async function runCogJob(input: RunJobInput): Promise<void> {
  const { jobId, seriesId } = input;
  const supabase = await createClient();

  // Fetch job to get image_model, use_thinking, image config, and shoot params
  const { data: job, error: jobFetchError } = await (supabase as any)
    .from('cog_jobs')
    .select('image_model, image_size, aspect_ratio, use_thinking, scene, art_direction, styling, camera, framing, lighting')
    .eq('id', jobId)
    .single();

  if (jobFetchError) {
    throw new Error(`Failed to fetch job: ${jobFetchError.message}`);
  }

  const jobImageModel: CogImageModel = job?.image_model || 'auto';
  const jobImageSize: CogImageSize = job?.image_size || '2K';
  const jobAspectRatio: CogAspectRatio = job?.aspect_ratio || '1:1';
  const useThinking: boolean = job?.use_thinking || false;
  const shootParams = {
    scene: job?.scene,
    art_direction: job?.art_direction,
    styling: job?.styling,
    camera: job?.camera,
    framing: job?.framing,
    lighting: job?.lighting,
  };

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

  // Fetch reference images
  const referenceImages = await fetchReferenceImages(jobId, supabase);
  const providedReferenceCount = referenceImages.length;

  console.log(`Job ${jobId}: Loaded ${providedReferenceCount} reference images, model setting: ${jobImageModel}`);

  // Select the appropriate model based on job settings and available APIs
  const selectedModel = selectImageModel(jobImageModel, providedReferenceCount > 0, providedReferenceCount);
  console.log(`Job ${jobId}: Selected model: ${selectedModel}`);

  const {
    references: effectiveReferenceImages,
    truncated: referencesTruncated,
    max: modelReferenceLimit,
  } = clampReferencesForModel(selectedModel, referenceImages);
  const usedReferenceCount = effectiveReferenceImages.length;
  if (referencesTruncated) {
    console.warn(
      `Job ${jobId}: Model ${selectedModel} supports ${modelReferenceLimit} references, trimming from ${providedReferenceCount}`,
    );
  }

  // Get all steps for this job
  const { data: steps, error: stepsError } = await (supabase as any)
    .from('cog_job_steps')
    .select('*')
    .eq('job_id', jobId)
    .order('sequence', { ascending: true });

  if (stepsError) {
    throw new Error(`Failed to fetch steps: ${stepsError.message}`);
  }

  // Pre-compute vision analysis once for the entire job (when thinking is enabled)
  // This avoids redundant vision API calls for each shot
  let cachedVisionAnalysis: VisionAnalysisResult | undefined;
  if (useThinking && selectedModel === 'gemini-3-pro-image' && usedReferenceCount > 0) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (apiKey) {
      console.log(`Job ${jobId}: Pre-computing vision analysis for ${usedReferenceCount} reference images (once for all shots)`);
      cachedVisionAnalysis = await analyzeReferenceImages(effectiveReferenceImages, apiKey);
      console.log(`Job ${jobId}: Vision analysis cached: ${cachedVisionAnalysis.metrics.durationMs}ms, ${cachedVisionAnalysis.metrics.tokensIn} in / ${cachedVisionAnalysis.metrics.tokensOut} out`);
    }
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
          // Use the step's prompt (already refined during job creation)
          // Falls back to previousOutput for backwards compatibility with old LLM+IMG job structure
          const promptToUse = step.prompt || previousOutput || 'Generate an image';

          if (!step.prompt && !previousOutput) {
            console.warn(`Step ${step.sequence} has no prompt, using fallback`);
          }

          // Generate image using the selected model
          let imageResult: {
            base64: string;
            mimeType: string;
            thinkingChain?: {
              originalPrompt: string;
              referenceAnalysis?: string[];
              refinedPrompt?: string;
              metrics?: {
                vision?: { durationMs: number; tokensIn?: number; tokensOut?: number };
                reasoning?: { durationMs: number; tokensIn?: number; tokensOut?: number };
                generation?: { durationMs: number };
                total?: { durationMs: number };
              };
            };
          };
          let modelId: string;
          let actualModelUsed: ResolvedImageModel = selectedModel;

          console.log(`Generating image with model: ${selectedModel} (job: ${jobImageModel}), size: ${jobImageSize}, aspect: ${jobAspectRatio}`);

          try {
            switch (selectedModel) {
              case 'flux-2-pro':
              case 'flux-2-dev': {
                modelId = selectedModel === 'flux-2-pro' ? 'black-forest-labs/flux-2-pro' : 'black-forest-labs/flux-2-dev';
                const fluxResult = await generateWithFlux({
                  prompt: promptToUse,
                  referenceImages: effectiveReferenceImages.map(ref => ({
                    base64: ref.base64,
                    mimeType: ref.mimeType,
                  })),
                  aspectRatio: mapAspectRatioToFlux(jobAspectRatio),
                  resolution: mapSizeToFluxResolution(jobImageSize, selectedModel),
                  model: selectedModel,
                });
                // Convert buffer to base64 for consistency with other models
                imageResult = {
                  base64: fluxResult.buffer.toString('base64'),
                  mimeType: 'image/png',
                };
                break;
              }

              case 'gemini-3-pro-image':
                modelId = 'gemini-3-pro-image-preview';
                imageResult = await generateImageWithGemini3Pro({
                  prompt: promptToUse,
                  referenceImages: effectiveReferenceImages,
                  aspectRatio: jobAspectRatio,
                  imageSize: jobImageSize,
                  thinking: useThinking,
                  shootParams: useThinking ? shootParams : undefined,
                  // Use cached vision analysis to avoid redundant API calls per shot
                  preComputedReferenceAnalysis: cachedVisionAnalysis,
                });
                break;

              case 'imagen-3-capability':
                modelId = 'imagen-3.0-capability-001';
                imageResult = await generateImageWithVertex({
                  prompt: promptToUse,
                  referenceImages: effectiveReferenceImages,
                  aspectRatio: jobAspectRatio,
                });
                break;

              case 'imagen-4':
              default:
                modelId = 'imagen-4.0-generate-001';
                const google = getGoogle();
                const { image } = await generateImage({
                  model: google.image(modelId),
                  prompt: promptToUse,
                  aspectRatio: jobAspectRatio,
                });
                imageResult = { base64: image.base64, mimeType: 'image/png' };
                break;
            }
          } catch (modelError) {
            // If primary model fails and we have a fallback option, try Imagen 4
            if (selectedModel !== 'imagen-4') {
              console.warn(
                `${selectedModel} failed, falling back to Imagen 4:`,
                modelError instanceof Error ? modelError.message : modelError
              );
              modelId = 'imagen-4.0-generate-001';
              actualModelUsed = 'imagen-4';
              const google = getGoogle();
              const { image } = await generateImage({
                model: google.image(modelId),
                prompt: promptToUse,
                aspectRatio: jobAspectRatio,
              });
              imageResult = { base64: image.base64, mimeType: 'image/png' };
            } else {
              throw modelError;
            }
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

          // Track which model was actually used for image generation
          const usedReferenceImages = actualModelUsed !== 'imagen-4' && usedReferenceCount > 0;
          const referenceNotes: string[] = [];
          if (referencesTruncated) {
            referenceNotes.push(`Only first ${modelReferenceLimit} reference images used (model limit).`);
          }

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
                selected_model: selectedModel,
                actual_model_used: actualModelUsed,
                step_id: step.id,
                step_sequence: step.sequence,
                reference_images_count: providedReferenceCount,
                reference_images_used: usedReferenceCount,
                references_note:
                  referenceNotes.length > 0
                    ? referenceNotes.join(' ')
                    : providedReferenceCount > 0 && !usedReferenceImages
                      ? 'Reference images could not be used with the selected model.'
                      : undefined,
              },
            })
            .select()
            .single();

          if (imageError) {
            throw new Error(`Failed to create image record: ${imageError.message}`);
          }

          // Update step with output (include thinking chain if available)
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
                // Include thinking chain for visualization
                ...(imageResult.thinkingChain && {
                  thinkingChain: imageResult.thinkingChain,
                }),
              },
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);

          // Kick off thumbnail generation (non-blocking so a failure doesn't break the job)
          generateThumbnails(imageRecord.id, storagePath).catch((thumbError) => {
            console.error('Failed to generate thumbnails for', imageRecord.id, thumbError);
          });

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
