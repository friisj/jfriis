/**
 * Replicate Inpainting Client
 *
 * Uses the Replicate HTTP API for mask-based inpainting.
 * Avoids SDK bundling issues with Next.js server actions.
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

// Use HTTP API directly to avoid Replicate SDK bundling issues with Next.js
async function runReplicateModel(
  model: string,
  input: Record<string, unknown>,
  apiToken: string
): Promise<unknown> {
  // Use the model-specific predictions endpoint for official models
  // Format: POST /v1/models/{owner}/{name}/predictions
  const createResponse = await fetch(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait', // Wait for result (up to 60s)
      },
      body: JSON.stringify({ input }),
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Replicate API error: ${createResponse.status} - ${errorText}`);
  }

  let prediction = await createResponse.json();

  // Poll if not complete (Prefer: wait may timeout for long generations)
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${apiToken}` },
    });
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error}`);
  }

  return prediction.output;
}

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
  /** Guidance for prompt adherence. Range 0-100, default 30 */
  guidanceScale?: number;
  /** Number of denoising steps. Range 1-50, default 28 */
  numInferenceSteps?: number;
  /** Random seed for reproducibility */
  seed?: number;
  /** Number of outputs to generate. Range 1-4, default 1 */
  numOutputs?: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
}

export interface InpaintingResult {
  /** Result image buffer (PNG) - first/only output */
  buffer: Buffer;
  /** All result buffers when numOutputs > 1 */
  buffers?: Buffer[];
  /** Processing duration in milliseconds */
  durationMs: number;
  /** Seed used for generation (for reproducibility) */
  seed?: number;
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
    seed,
    numOutputs = 1,
    width,
    height,
  } = options;

  const startTime = Date.now();

  console.log('Replicate inpainting request:', {
    model: INPAINTING_MODEL,
    prompt: prompt.slice(0, 80),
    dimensions: `${width}x${height}`,
    guidance: guidanceScale,
    steps: numInferenceSteps,
    seed: seed ?? 'random',
    numOutputs,
    imageSize: `${Math.round(imageBuffer.length / 1024)}KB`,
    maskSize: `${Math.round(maskBuffer.length / 1024)}KB`,
  });

  // Convert buffers to data URIs for the HTTP API
  const imageDataUri = `data:image/png;base64,${imageBuffer.toString('base64')}`;
  const maskDataUri = `data:image/png;base64,${maskBuffer.toString('base64')}`;

  // Build input parameters
  const input: Record<string, unknown> = {
    image: imageDataUri,
    mask: maskDataUri,
    prompt,
    guidance: guidanceScale, // flux-fill-dev uses 'guidance' not 'guidance_scale'
    num_inference_steps: numInferenceSteps,
    num_outputs: numOutputs,
    megapixels: 'match_input', // Preserve input resolution
    output_format: 'png',
    output_quality: 100,
  };

  // Only add seed if specified (otherwise let model generate random)
  if (seed !== undefined) {
    input.seed = seed;
  }

  // Run the prediction using HTTP API (avoids SDK bundling issues)
  // See: https://replicate.com/black-forest-labs/flux-fill-dev
  const output = await runReplicateModel(INPAINTING_MODEL, input, apiToken);

  // Output is always an array of URLs for flux-fill-dev
  let outputUrls: string[];
  if (typeof output === 'string') {
    outputUrls = [output];
  } else if (Array.isArray(output) && output.length > 0) {
    outputUrls = output as string[];
  } else {
    console.error('Unexpected output format:', output);
    throw new Error('No output from Replicate');
  }

  console.log(`Fetching ${outputUrls.length} result(s)...`);

  // Fetch all result images
  const buffers: Buffer[] = [];
  for (const url of outputUrls) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch result: ${response.status}`);
    }
    buffers.push(Buffer.from(await response.arrayBuffer()));
  }

  const durationMs = Date.now() - startTime;

  console.log('Replicate inpainting complete:', {
    durationMs,
    numOutputs: buffers.length,
    outputSize: `${Math.round(buffers[0].length / 1024)}KB`,
  });

  // Validate output size - real images should be substantial
  if (buffers[0].length < 10000) {
    console.warn('WARNING: Output is very small, may be an error image');
  }

  return {
    buffer: buffers[0],
    buffers: buffers.length > 1 ? buffers : undefined,
    durationMs,
    seed,
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
