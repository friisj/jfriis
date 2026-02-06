/**
 * Replicate Inpainting Client
 *
 * Uses the official Replicate SDK for mask-based inpainting.
 * Properly handles file uploads and long-running predictions.
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

import Replicate from 'replicate';

// Model configuration - using official Black Forest Labs Flux Fill model
// This is the official inpainting model with excellent mask interpretation
// See: https://replicate.com/black-forest-labs/flux-fill-dev
const INPAINTING_MODEL = 'black-forest-labs/flux-fill-dev' as const;

export interface InpaintingOptions {
  /** Image buffer (PNG format) */
  imageBuffer: Buffer;
  /** Mask buffer (PNG format, grayscale - white = edit, black = preserve) */
  maskBuffer: Buffer;
  /** Prompt describing what to generate in masked area */
  prompt: string;
  /** Negative prompt to avoid certain elements */
  negativePrompt?: string;
  /** Guidance scale for prompt adherence. Default 7.5 */
  guidanceScale?: number;
  /** Number of denoising steps. Default 28 for Flux */
  numInferenceSteps?: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
}

export interface InpaintingResult {
  /** Result image buffer (PNG) */
  buffer: Buffer;
  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Perform inpainting using Black Forest Labs' official flux-fill-dev model.
 *
 * Both image and mask should be:
 * - Same dimensions
 * - PNG format
 *
 * Mask should be grayscale where:
 * - White (255) = areas to inpaint
 * - Black (0) = areas to preserve
 *
 * @see https://replicate.com/black-forest-labs/flux-fill-dev
 */
export async function inpaintWithReplicate(
  options: InpaintingOptions
): Promise<InpaintingResult> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const {
    imageBuffer,
    maskBuffer,
    prompt,
    guidanceScale = 30, // flux-fill-dev default is 30 (high guidance)
    numInferenceSteps = 28, // flux-fill-dev default
    width,
    height,
  } = options;

  const startTime = Date.now();

  console.log('Replicate inpainting request:', {
    model: INPAINTING_MODEL,
    prompt: prompt.slice(0, 80),
    dimensions: `${width}x${height}`,
    imageSize: `${Math.round(imageBuffer.length / 1024)}KB`,
    maskSize: `${Math.round(maskBuffer.length / 1024)}KB`,
  });

  // Initialize the Replicate client
  const replicate = new Replicate({
    auth: apiToken,
  });

  // Run the prediction using the official flux-fill-dev model
  // See: https://replicate.com/black-forest-labs/flux-fill-dev
  const output = await replicate.run(INPAINTING_MODEL, {
    input: {
      image: imageBuffer,
      mask: maskBuffer,
      prompt,
      guidance: guidanceScale, // flux-fill-dev uses 'guidance' not 'guidance_scale'
      num_inference_steps: numInferenceSteps,
      megapixels: 'match_input', // Preserve input resolution
      output_format: 'png',
      output_quality: 100,
    },
  });

  // Output can be a single URL string or array
  let outputUrl: string;
  if (typeof output === 'string') {
    outputUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    outputUrl = output[0] as string;
  } else {
    console.error('Unexpected output format:', output);
    throw new Error('No output from Replicate');
  }

  console.log('Fetching result from:', outputUrl);

  // Fetch the result image
  const response = await fetch(outputUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch result: ${response.status}`);
  }

  const resultBuffer = Buffer.from(await response.arrayBuffer());

  const durationMs = Date.now() - startTime;

  console.log('Replicate inpainting complete:', {
    durationMs,
    outputSize: `${Math.round(resultBuffer.length / 1024)}KB`,
  });

  // Validate output size - real images should be substantial
  if (resultBuffer.length < 10000) {
    console.warn('WARNING: Output is very small, may be an error image');
  }

  return {
    buffer: resultBuffer,
    durationMs,
  };
}

/**
 * Check if Replicate is configured.
 */
export function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_TOKEN;
}

/**
 * Get the default prompt for spot removal (blemish/object removal)
 */
export function getSpotRemovalPrompt(): string {
  return 'clean, smooth, natural continuation of surrounding area, high quality, photorealistic';
}

/**
 * Get the default negative prompt for inpainting
 */
export function getDefaultNegativePrompt(): string {
  return 'blurry, low quality, distorted, artifacts, unnatural, deformed';
}
