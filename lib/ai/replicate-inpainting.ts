/**
 * Replicate Inpainting Client
 *
 * Uses Replicate API to perform mask-based inpainting with Stable Diffusion models.
 * Supports both SD 1.5 inpainting and SDXL inpainting variants.
 *
 * Requires: REPLICATE_API_TOKEN env var
 */

// Available inpainting models on Replicate
export const INPAINTING_MODELS = {
  // Stable Diffusion 1.5 Inpainting - fast, good for general use
  SD_INPAINTING: 'stability-ai/stable-diffusion-inpainting',
  // SDXL-based inpainting - higher quality, slower
  SDXL_INPAINTING: 'lucataco/sdxl-inpainting',
  // Alternative SDXL model
  REALISTIC_VISION_INPAINTING: 'cjwbw/realistic-vision-v5-inpainting',
} as const;

export type InpaintingModel = (typeof INPAINTING_MODELS)[keyof typeof INPAINTING_MODELS];

export interface InpaintingOptions {
  /** Base64-encoded source image (PNG/JPEG) */
  imageBase64: string;
  /** MIME type of the source image */
  imageMimeType: string;
  /** Base64-encoded mask image (PNG). White = edit area, Black = preserve */
  maskBase64: string;
  /** Optional prompt for guided editing. For spot removal, can be minimal or omitted */
  prompt?: string;
  /** Negative prompt to avoid certain elements */
  negativePrompt?: string;
  /** Guidance scale for prompt adherence. Default 7.5 */
  guidanceScale?: number;
  /** Number of denoising steps. Default 50 */
  numInferenceSteps?: number;
  /** Strength of the inpainting. Default 0.8 (0-1, higher = more change) */
  strength?: number;
  /** Which model to use. Default SD_INPAINTING */
  model?: InpaintingModel;
}

export interface InpaintingResult {
  /** Base64-encoded result image */
  base64: string;
  /** MIME type (always image/png for Replicate outputs) */
  mimeType: string;
  /** Processing duration in milliseconds */
  durationMs: number;
  /** The model that was used */
  model: InpaintingModel;
}

interface ReplicatePrediction {
  id: string;
  version: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output: string[] | null;
  error: string | null;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Poll a Replicate prediction until it completes
 */
async function pollPrediction(
  predictionId: string,
  apiToken: string,
  maxAttempts = 60,
  pollIntervalMs = 1000
): Promise<ReplicatePrediction> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to poll prediction: ${response.status}`);
    }

    const prediction: ReplicatePrediction = await response.json();

    if (prediction.status === 'succeeded') {
      return prediction;
    }

    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(prediction.error || `Prediction ${prediction.status}`);
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error('Prediction timed out');
}

/**
 * Convert a URL to base64 by fetching it
 */
async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

/**
 * Build input object based on model type
 */
function buildModelInput(
  options: InpaintingOptions,
  imageDataUri: string,
  maskDataUri: string
): Record<string, unknown> {
  const {
    prompt = 'high quality, detailed, photorealistic',
    negativePrompt = 'blurry, low quality, distorted, artifacts',
    guidanceScale = 7.5,
    numInferenceSteps = 30,
    strength = 0.7,
    model = INPAINTING_MODELS.SD_INPAINTING,
  } = options;

  // Different models have different input schemas
  if (model === INPAINTING_MODELS.SD_INPAINTING) {
    // stability-ai/stable-diffusion-inpainting (SD 2.0 based)
    // Note: This model uses 512x512 natively
    return {
      image: imageDataUri,
      mask: maskDataUri,
      prompt,
      negative_prompt: negativePrompt,
      guidance_scale: guidanceScale,
      num_inference_steps: numInferenceSteps,
      scheduler: 'DPMSolverMultistep',
      num_outputs: 1,
    };
  }

  if (model === INPAINTING_MODELS.SDXL_INPAINTING) {
    // lucataco/sdxl-inpainting (SDXL based, higher quality)
    // Note: This model works with larger images natively
    return {
      image: imageDataUri,
      mask: maskDataUri,
      prompt,
      negative_prompt: negativePrompt,
      guidance_scale: Math.min(guidanceScale, 10), // Max 10 for this model
      steps: Math.min(numInferenceSteps, 80), // Max 80 for this model
      strength: Math.max(0.01, Math.min(strength, 1)), // 0.01-1 range
      scheduler: 'K_EULER',
      num_outputs: 1,
    };
  }

  if (model === INPAINTING_MODELS.REALISTIC_VISION_INPAINTING) {
    // cjwbw/realistic-vision-v5-inpainting
    return {
      image: imageDataUri,
      mask: maskDataUri,
      prompt,
      negative_prompt: negativePrompt,
      guidance_scale: guidanceScale,
      num_inference_steps: numInferenceSteps,
      strength,
    };
  }

  // Default fallback
  return {
    image: imageDataUri,
    mask: maskDataUri,
    prompt,
    negative_prompt: negativePrompt,
    guidance_scale: guidanceScale,
    num_inference_steps: numInferenceSteps,
  };
}

/**
 * Perform inpainting on an image using a mask.
 *
 * @param options - Inpainting configuration
 * @returns The inpainted image as base64
 */
export async function inpaintWithReplicate(
  options: InpaintingOptions
): Promise<InpaintingResult> {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const {
    imageBase64,
    imageMimeType,
    maskBase64,
    model = INPAINTING_MODELS.SD_INPAINTING,
  } = options;

  const startTime = Date.now();

  // Convert to data URIs for Replicate
  const imageDataUri = `data:${imageMimeType};base64,${imageBase64}`;
  const maskDataUri = `data:image/png;base64,${maskBase64}`;

  // Build model-specific input
  const input = buildModelInput(options, imageDataUri, maskDataUri);

  console.log('Replicate inpainting request:', {
    model,
    promptPreview: options.prompt?.slice(0, 100),
    imageSize: Math.round((imageBase64.length * 0.75) / 1024) + 'KB',
    maskSize: Math.round((maskBase64.length * 0.75) / 1024) + 'KB',
  });

  // Create prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: getModelVersion(model),
      input,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Replicate create error:', {
      status: createResponse.status,
      body: errorText.slice(0, 500),
    });
    throw new Error(
      `Replicate API error: ${createResponse.status} - ${errorText.slice(0, 200)}`
    );
  }

  const createResult: ReplicatePrediction = await createResponse.json();
  console.log('Replicate prediction created:', {
    id: createResult.id,
    status: createResult.status,
  });

  // Poll until complete
  const finalPrediction = await pollPrediction(createResult.id, apiToken);

  if (!finalPrediction.output || finalPrediction.output.length === 0) {
    throw new Error('No output from Replicate prediction');
  }

  // Fetch the output image and convert to base64
  const outputUrl = finalPrediction.output[0];
  const resultBase64 = await urlToBase64(outputUrl);

  const durationMs = Date.now() - startTime;

  console.log('Replicate inpainting complete:', {
    id: createResult.id,
    durationMs,
    predictTime: finalPrediction.metrics?.predict_time,
    outputSize: Math.round((resultBase64.length * 0.75) / 1024) + 'KB',
  });

  return {
    base64: resultBase64,
    mimeType: 'image/png',
    durationMs,
    model,
  };
}

/**
 * Get the specific model version for Replicate.
 * These are pinned versions that we know work.
 */
function getModelVersion(model: InpaintingModel): string {
  switch (model) {
    case INPAINTING_MODELS.SD_INPAINTING:
      // stability-ai/stable-diffusion-inpainting (SD 2.0 based)
      return '95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3';
    case INPAINTING_MODELS.SDXL_INPAINTING:
      // lucataco/sdxl-inpainting
      return 'a5b13068cc81a89a4fbeefeccc774869fcb34df4dbc92c1555e0f2771d49dde7';
    case INPAINTING_MODELS.REALISTIC_VISION_INPAINTING:
      // cjwbw/realistic-vision-v5-inpainting - will verify if needed
      return 'aff48af9c68d162388d230a2ab003f68d2638b33e4a46d40b76f1a6ee22d8f41';
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * Check if Replicate inpainting is configured and available.
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
