/**
 * Replicate Flux 2 Client
 *
 * Integrates Black Forest Labs' Flux 2 models for image generation.
 * Supports both Flux 2 Pro (up to 8 refs, 4MP) and Flux 2 Dev (up to 5 refs, 2MP).
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

  // Select the model
  const modelId = model === 'flux-2-pro' ? FLUX_2_PRO_MODEL : FLUX_2_DEV_MODEL;

  // Build input parameters
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    megapixels: effectiveResolution,
    output_format: 'png',
    guidance_scale: guidanceScale,
    num_inference_steps: numInferenceSteps,
  };

  // Set most permissive safety settings for private creative use
  // Flux 2 Pro uses safety_tolerance (1=strict, 6=permissive)
  // Flux 2 Dev uses disable_safety_checker boolean
  if (model === 'flux-2-pro') {
    input.safety_tolerance = 6;
  } else {
    input.disable_safety_checker = true;
  }

  if (seed !== undefined) {
    input.seed = seed;
  }

  if (promptUpsampling) {
    input.prompt_upsampling = true;
  }

  // Add reference images if provided
  // Both Flux 2 Pro and Dev use 'input_images' array parameter
  // Pro supports up to 8 images, Dev supports up to 5
  if (refs.length > 0) {
    const imageUris = refs.map((ref) => toDataUri(ref.base64, ref.mimeType));
    input.input_images = imageUris;

    console.log('Flux reference images:', {
      count: imageUris.length,
      firstImagePreview: imageUris[0].slice(0, 50) + '...',
    });
  }

  // Run the prediction using HTTP API (avoids SDK bundling issues)
  const output = await runReplicateModel(modelId, input, apiToken);

  // Output can be:
  // - A single URL string
  // - An array of URL strings
  // - An array of FileOutput objects (Replicate SDK v1.x)
  // FileOutput objects have a .url() async method or can be converted with String()
  let outputUrl: string;
  if (typeof output === 'string') {
    outputUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    const firstOutput = output[0];
    if (typeof firstOutput === 'string') {
      outputUrl = firstOutput;
    } else if (firstOutput && typeof firstOutput === 'object') {
      // FileOutput object - convert to string (calls internal toString which returns URL)
      outputUrl = String(firstOutput);
    } else {
      console.error('Unexpected array element format:', firstOutput);
      throw new Error('Invalid output format from Flux generation');
    }
  } else if (output && typeof output === 'object') {
    // Single FileOutput object
    outputUrl = String(output);
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
