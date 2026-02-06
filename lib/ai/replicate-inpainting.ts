/**
 * Replicate Inpainting Client
 *
 * Uses the official Replicate SDK for mask-based inpainting.
 * Properly handles file uploads and long-running predictions.
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

import Replicate from 'replicate';

// Model configuration - using stability-ai model which allows disabling safety filter
const INPAINTING_MODEL = 'stability-ai/stable-diffusion-inpainting';
const INPAINTING_VERSION = '95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3';

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
  /** Number of denoising steps. Default 50 */
  numInferenceSteps?: number;
  /** Output width (must be multiple of 64) */
  width: number;
  /** Output height (must be multiple of 64) */
  height: number;
}

export interface InpaintingResult {
  /** Result image buffer (PNG) */
  buffer: Buffer;
  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Perform inpainting using Replicate's stable-diffusion-inpainting model.
 *
 * Both image and mask should be:
 * - Same dimensions
 * - Dimensions divisible by 8
 * - PNG format
 *
 * Mask should be grayscale where:
 * - White (255) = areas to inpaint
 * - Black (0) = areas to preserve
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
    negativePrompt = 'blurry, low quality, distorted, artifacts',
    guidanceScale = 7.5,
    numInferenceSteps = 50,
    width,
    height,
  } = options;

  const startTime = Date.now();

  console.log('Replicate inpainting request:', {
    model: INPAINTING_MODEL,
    prompt: prompt.slice(0, 80),
    imageSize: `${Math.round(imageBuffer.length / 1024)}KB`,
    maskSize: `${Math.round(maskBuffer.length / 1024)}KB`,
  });

  // Initialize the Replicate client
  const replicate = new Replicate({
    auth: apiToken,
  });

  // Run the prediction
  // The SDK automatically uploads buffers for us
  const output = await replicate.run(
    `${INPAINTING_MODEL}:${INPAINTING_VERSION}`,
    {
      input: {
        image: imageBuffer,
        mask: maskBuffer,
        prompt,
        negative_prompt: negativePrompt,
        guidance_scale: guidanceScale,
        num_inference_steps: numInferenceSteps,
        num_outputs: 1,
        width,
        height,
        // Disable NSFW filter for legitimate artistic edits
        disable_safety_checker: true,
      },
    }
  );

  // Output is an array of URLs
  const outputUrls = output as string[];
  if (!outputUrls || outputUrls.length === 0) {
    throw new Error('No output from Replicate');
  }

  const outputUrl = outputUrls[0];
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
