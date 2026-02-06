/**
 * Replicate Flux 2 Client
 *
 * Integrates Black Forest Labs' Flux 2 models for image generation.
 * Supports both Flux 2 Pro (up to 8 refs, 4MP) and Flux 2 Dev (up to 5 refs, 2MP).
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

import Replicate from 'replicate';

// Model identifiers on Replicate
const FLUX_2_PRO_MODEL = 'black-forest-labs/flux-2-pro' as const;
const FLUX_2_DEV_MODEL = 'black-forest-labs/flux-2-dev' as const;

// Flux supports these aspect ratios directly
export type FluxAspectRatio =
  | '1:1'
  | '16:9'
  | '3:2'
  | '2:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '3:4'
  | '4:3'
  | '21:9';

// Resolution in megapixels
export type FluxResolution = '0.5' | '1' | '2' | '4';

export type FluxModel = 'flux-2-pro' | 'flux-2-dev';

export interface FluxGenerationOptions {
  /** Generation prompt */
  prompt: string;
  /** Reference images as base64 strings with MIME types */
  referenceImages?: Array<{
    base64: string;
    mimeType: string;
  }>;
  /** Aspect ratio for output. Default: '1:1' */
  aspectRatio?: FluxAspectRatio;
  /** Resolution in megapixels. Flux 2 Dev max is 2MP. Default: '1' */
  resolution?: FluxResolution;
  /** Random seed for reproducibility */
  seed?: number;
  /** Enable prompt upsampling for auto-enhancement. Default: false */
  promptUpsampling?: boolean;
  /** Which Flux model to use. Default: 'flux-2-dev' */
  model?: FluxModel;
  /** Guidance scale (how strongly to follow the prompt). Default: 3 */
  guidanceScale?: number;
  /** Number of inference steps. Default: 28 */
  numInferenceSteps?: number;
}

export interface FluxGenerationResult {
  /** Result image buffer (PNG or WebP) */
  buffer: Buffer;
  /** Processing duration in milliseconds */
  durationMs: number;
  /** Model that was used */
  model: FluxModel;
  /** Seed used for generation */
  seed?: number;
}

/**
 * Get maximum allowed reference images for a Flux model.
 */
export function getMaxReferenceImages(model: FluxModel): number {
  return model === 'flux-2-pro' ? 8 : 5;
}

/**
 * Get maximum resolution for a Flux model.
 */
export function getMaxResolution(model: FluxModel): FluxResolution {
  return model === 'flux-2-pro' ? '4' : '2';
}

/**
 * Convert a base64 image to a data URI for Replicate.
 */
function toDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Generate an image using Flux 2 models via Replicate.
 */
export async function generateWithFlux(
  options: FluxGenerationOptions
): Promise<FluxGenerationResult> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const {
    prompt,
    referenceImages = [],
    aspectRatio = '1:1',
    resolution = '1',
    seed,
    promptUpsampling = false,
    model = 'flux-2-dev',
    guidanceScale = 3,
    numInferenceSteps = 28,
  } = options;

  const startTime = Date.now();

  // Validate reference image count
  const maxRefs = getMaxReferenceImages(model);
  if (referenceImages.length > maxRefs) {
    console.warn(
      `Flux ${model} supports max ${maxRefs} reference images, got ${referenceImages.length}. Using first ${maxRefs}.`
    );
  }
  const refs = referenceImages.slice(0, maxRefs);

  // Cap resolution for Dev model
  let effectiveResolution = resolution;
  const maxRes = getMaxResolution(model);
  if (parseFloat(resolution) > parseFloat(maxRes)) {
    console.warn(
      `Flux ${model} max resolution is ${maxRes}MP, capping from ${resolution}MP`
    );
    effectiveResolution = maxRes;
  }

  console.log('Flux generation request:', {
    model,
    prompt: prompt.slice(0, 80),
    aspectRatio,
    resolution: effectiveResolution,
    referenceCount: refs.length,
    promptUpsampling,
  });

  // Initialize the Replicate client
  const replicate = new Replicate({
    auth: apiToken,
  });

  // Select the model
  const modelId = model === 'flux-2-pro' ? FLUX_2_PRO_MODEL : FLUX_2_DEV_MODEL;

  // Build input parameters
  // Note: Flux 2 uses 'image_prompt' for reference images
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    megapixels: effectiveResolution,
    output_format: 'png',
    guidance_scale: guidanceScale,
    num_inference_steps: numInferenceSteps,
  };

  if (seed !== undefined) {
    input.seed = seed;
  }

  if (promptUpsampling) {
    input.prompt_upsampling = true;
  }

  // Add reference images if provided
  // Flux 2 Pro uses 'image_prompt' array, Dev uses single or array
  if (refs.length > 0) {
    const imagePrompts = refs.map((ref) => toDataUri(ref.base64, ref.mimeType));
    if (model === 'flux-2-pro') {
      // Pro model accepts array of image prompts
      input.image_prompt = imagePrompts;
    } else {
      // Dev model - use image_prompt for single, or image_prompts for multiple
      if (refs.length === 1) {
        input.image_prompt = imagePrompts[0];
      } else {
        input.image_prompts = imagePrompts;
      }
    }
    // Set image prompt strength (how much to follow reference)
    input.image_prompt_strength = 0.1; // Default value, can be tuned
  }

  // Run the prediction
  const output = await replicate.run(modelId, { input });

  // Output can be a single URL string or array
  let outputUrl: string;
  if (typeof output === 'string') {
    outputUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    outputUrl = output[0] as string;
  } else if (output && typeof output === 'object' && 'url' in output) {
    outputUrl = (output as { url: string }).url;
  } else {
    console.error('Unexpected Flux output format:', output);
    throw new Error('No output from Flux generation');
  }

  console.log('Fetching Flux result from:', outputUrl);

  // Fetch the result image
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Flux result: ${response.status}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());

  const durationMs = Date.now() - startTime;

  console.log('Flux generation complete:', {
    model,
    durationMs,
    outputSize: `${Math.round(resultBuffer.length / 1024)}KB`,
  });

  // Validate output size
  if (resultBuffer.length < 10000) {
    console.warn('WARNING: Flux output is very small, may be an error image');
  }

  return {
    buffer: resultBuffer,
    durationMs,
    model,
    seed: typeof seed === 'number' ? seed : undefined,
  };
}

/**
 * Check if Replicate is configured for Flux.
 */
export function isFluxConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}
