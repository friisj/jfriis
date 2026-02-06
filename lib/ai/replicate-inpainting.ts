/**
 * Replicate Inpainting Client
 *
 * Uses the official Replicate SDK for mask-based inpainting.
 * Properly handles file uploads and long-running predictions.
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

import Replicate from 'replicate';

// Model configuration - using Flux-based inpainting for quality and reliability
// This model handles various image sizes and has good mask interpretation
// See: https://replicate.com/zsxkib/flux-dev-inpainting
const INPAINTING_MODEL = 'zsxkib/flux-dev-inpainting' as const;

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
 * Perform inpainting using Replicate's zsxkib/flux-dev-inpainting model.
 *
 * Both image and mask should be:
 * - Same dimensions
 * - PNG format
 *
 * Mask should be grayscale where:
 * - White (255) = areas to inpaint
 * - Black (0) = areas to preserve
 *
 * @see https://replicate.com/zsxkib/flux-dev-inpainting
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
    guidanceScale = 7, // Model default
    numInferenceSteps = 30, // Model default
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

  // Run the prediction using the model without version pinning
  // The SDK will use the latest version
  const output = await replicate.run(INPAINTING_MODEL, {
    input: {
      image: imageBuffer,
      mask: maskBuffer,
      prompt,
      guidance_scale: guidanceScale,
      num_inference_steps: numInferenceSteps,
      width,
      height,
      // Flux inpainting parameters
      strength: 0.85, // How much to change the masked area (0-1)
      output_format: 'png',
      output_quality: 100, // Max quality for PNG
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
