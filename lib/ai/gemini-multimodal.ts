/**
 * Gemini 3 Pro Image Generation Client
 *
 * Uses the generateContent endpoint with responseModalities: ['IMAGE']
 * to generate images with up to 14 reference images, 4K output, and
 * better text rendering compared to Imagen.
 *
 * Requires: GOOGLE_GENERATIVE_AI_API_KEY env var
 */

interface ReferenceImage {
  base64: string;
  mimeType: string;
  subjectDescription?: string;
}

interface ShootParams {
  scene?: string | null;
  art_direction?: string | null;
  styling?: string | null;
  camera?: string | null;
  framing?: string | null;
  lighting?: string | null;
}

type ImageSize = '1K' | '2K' | '4K';
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';

interface GeminiMultimodalOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: AspectRatio;
  /**
   * Output image resolution. Defaults to '2K'.
   * - '1K': ~1024px on longest edge
   * - '2K': ~2048px on longest edge
   * - '4K': ~4096px on longest edge (highest quality)
   */
  imageSize?: ImageSize;
  /**
   * Enable thinking mode for better reasoning about image composition.
   * When enabled:
   * - If reference images exist: Uses vision to describe them, then LLM reasoning
   * - If no reference images: Uses LLM reasoning on prompt + shoot params
   */
  thinking?: boolean;
  /**
   * Shoot parameters for the thinking step to consider
   */
  shootParams?: ShootParams;
}

interface StepMetrics {
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
}

interface ThinkingChain {
  referenceAnalysis?: string[];  // Vision descriptions of each reference image
  refinedPrompt?: string;        // The prompt after LLM reasoning
  originalPrompt: string;        // The original input prompt
  // Metrics for each step
  metrics?: {
    vision?: StepMetrics;
    reasoning?: StepMetrics;
    generation?: StepMetrics;
    total?: StepMetrics;
  };
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
  thinkingChain?: ThinkingChain;
}

interface VisionAnalysisResult {
  descriptions: string[];
  metrics: StepMetrics;
}

/**
 * Analyze reference images using Gemini's vision capabilities.
 * Returns detailed descriptions of each image for use in prompt refinement.
 */
async function analyzeReferenceImages(
  referenceImages: ReferenceImage[],
  apiKey: string
): Promise<VisionAnalysisResult> {
  const descriptions: string[] = [];
  const startTime = Date.now();
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (let i = 0; i < referenceImages.length; i++) {
    const img = referenceImages[i];

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64,
              },
            },
            {
              text: `Analyze this reference image for use in AI image generation. Describe:
1. Subject: What/who is in the image (appearance, features, distinguishing characteristics)
2. Style: Visual style, artistic treatment, color palette
3. Lighting: Type, direction, quality of light
4. Composition: Framing, perspective, depth
5. Mood/Atmosphere: Overall feeling the image conveys
6. Technical: Image quality, focus, any notable photographic techniques

${img.subjectDescription ? `Context provided by user: "${img.subjectDescription}"` : ''}

Provide a concise but detailed description that would help recreate similar visual elements.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`Vision analysis failed for image ${i + 1}:`, await response.text());
        descriptions.push(`[Image ${i + 1}: Analysis failed]`);
        continue;
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      // Extract token usage from response
      const usageMetadata = result.usageMetadata;
      if (usageMetadata) {
        totalTokensIn += usageMetadata.promptTokenCount || 0;
        totalTokensOut += usageMetadata.candidatesTokenCount || 0;
      }

      if (text) {
        descriptions.push(`[Reference Image ${i + 1}]\n${text}`);
        console.log(`Vision analysis for image ${i + 1} complete (${text.length} chars)`);
      } else {
        descriptions.push(`[Image ${i + 1}: No description generated]`);
      }
    } catch (error) {
      console.error(`Vision analysis error for image ${i + 1}:`, error);
      descriptions.push(`[Image ${i + 1}: Analysis error]`);
    }
  }

  return {
    descriptions,
    metrics: {
      durationMs: Date.now() - startTime,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
    },
  };
}

interface ReasoningResult {
  refinedPrompt: string;
  metrics: StepMetrics;
}

/**
 * Use LLM reasoning to refine the prompt for image generation.
 * Considers reference image descriptions, shoot parameters, and the original prompt.
 */
async function refinePromptWithReasoning(
  originalPrompt: string,
  referenceDescriptions: string[],
  shootParams: ShootParams | undefined,
  apiKey: string
): Promise<ReasoningResult> {
  const startTime = Date.now();

  const shootContext = shootParams ? `
Shoot Parameters:
- Scene: ${shootParams.scene || 'Not specified'}
- Art Direction: ${shootParams.art_direction || 'Not specified'}
- Styling: ${shootParams.styling || 'Not specified'}
- Camera: ${shootParams.camera || 'Not specified'}
- Framing: ${shootParams.framing || 'Not specified'}
- Lighting: ${shootParams.lighting || 'Not specified'}
` : '';

  const referenceContext = referenceDescriptions.length > 0
    ? `Reference Images Analysis:\n${referenceDescriptions.join('\n\n')}\n\n`
    : '';

  const reasoningPrompt = `You are an expert photographer and art director preparing a prompt for AI image generation. Your goal is to transform simple prompts into highly detailed, photorealistic specifications.

${referenceContext}${shootContext}
Original Prompt: "${originalPrompt}"

Your task: Create an EXTENSIVELY DETAILED prompt that will produce photorealistic, professional-quality output. The image model responds best to specific technical details.

REQUIRED ELEMENTS (include ALL of these):

1. **Resolution & Quality Keywords**: Always include phrases like "8K resolution", "ultra high definition", "extremely detailed", "photorealistic", "hyperrealistic"

2. **Camera & Lens Specifications**: Include specific details like:
   - Lens type: "shot on 35mm lens", "85mm portrait lens", "wide angle 24mm"
   - Camera: "shot on Sony A7R IV", "DSLR quality", "medium format"
   - Aperture effects: "shallow depth of field, f/1.4", "bokeh background"

3. **Lighting (be VERY specific)**:
   - Type: "soft diffused lighting", "dramatic rim lighting", "golden hour sunlight", "studio three-point lighting"
   - Direction: "backlit", "side-lit from the left", "overhead soft box"
   - Quality: "volumetric light rays", "soft shadows", "specular highlights"
   - Color temperature: "warm tungsten glow", "cool blue hour tones"

4. **Textures & Materials**: Describe surface qualities - "skin pores visible", "fabric texture detail", "reflective metallic surfaces", "matte finish"

5. **Atmosphere & Mood**: "cinematic atmosphere", "moody and dramatic", "ethereal and dreamy", "gritty and raw"

6. **Professional Photography Terms**: "professional color grading", "film grain", "RAW photo", "award-winning photography", "editorial quality"

CRITICAL RULES:
- If reference images are provided, you MUST start with reference markers: "[1] [2] A portrait of the subject..."
- If references show a person, emphasize: "maintaining exact facial features, likeness, and characteristics from reference"
- Keep under 400 words but be MAXIMALLY descriptive
- Every sentence should add specific visual detail

Output ONLY the refined prompt, nothing else.`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: reasoningPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800, // Increased for more detailed photorealistic prompts
    },
  };

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.error('Prompt refinement failed:', await response.text());
      return {
        refinedPrompt: originalPrompt,
        metrics: { durationMs: Date.now() - startTime },
      };
    }

    const result = await response.json();
    const refinedPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    // Extract token usage
    const usageMetadata = result.usageMetadata;
    const metrics: StepMetrics = {
      durationMs: Date.now() - startTime,
      tokensIn: usageMetadata?.promptTokenCount,
      tokensOut: usageMetadata?.candidatesTokenCount,
    };

    if (refinedPrompt) {
      console.log('Prompt refinement complete:', {
        originalLength: originalPrompt.length,
        refinedLength: refinedPrompt.length,
        durationMs: metrics.durationMs,
        tokensIn: metrics.tokensIn,
        tokensOut: metrics.tokensOut,
      });
      return { refinedPrompt, metrics };
    }

    return { refinedPrompt: originalPrompt, metrics };
  } catch (error) {
    console.error('Prompt refinement error:', error);
    return {
      refinedPrompt: originalPrompt,
      metrics: { durationMs: Date.now() - startTime },
    };
  }
}

/**
 * Generate an image using Gemini 3 Pro Image Preview model.
 * This model supports up to 14 reference images and 4K output.
 */
export async function generateImageWithGemini3Pro(
  options: GeminiMultimodalOptions
): Promise<GeneratedImage> {
  const { prompt, referenceImages = [], aspectRatio = '1:1', imageSize = '2K', thinking, shootParams } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  // Track thinking chain for visualization
  let thinkingChain: ThinkingChain | undefined;
  const totalStartTime = Date.now();

  // If thinking is enabled, use vision + reasoning pipeline
  let finalPrompt = prompt;
  if (thinking) {
    console.log('Thinking mode enabled - running vision + reasoning pipeline');

    let visionMetrics: StepMetrics | undefined;
    let reasoningMetrics: StepMetrics | undefined;

    // Step 1: Analyze reference images with vision (if any)
    let referenceDescriptions: string[] = [];
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference images...`);
      const visionResult = await analyzeReferenceImages(referenceImages, apiKey);
      referenceDescriptions = visionResult.descriptions;
      visionMetrics = visionResult.metrics;
      console.log(`Vision analysis complete: ${visionMetrics.durationMs}ms, ${visionMetrics.tokensIn} in / ${visionMetrics.tokensOut} out`);
    }

    // Step 2: Refine prompt with LLM reasoning
    console.log('Refining prompt with LLM reasoning...');
    const reasoningResult = await refinePromptWithReasoning(
      prompt,
      referenceDescriptions,
      shootParams,
      apiKey
    );
    finalPrompt = reasoningResult.refinedPrompt;
    reasoningMetrics = reasoningResult.metrics;
    console.log(`Reasoning complete: ${reasoningMetrics.durationMs}ms, ${reasoningMetrics.tokensIn} in / ${reasoningMetrics.tokensOut} out`);

    // Capture the thinking chain for visualization
    thinkingChain = {
      originalPrompt: prompt,
      referenceAnalysis: referenceDescriptions.length > 0 ? referenceDescriptions : undefined,
      refinedPrompt: finalPrompt,
      metrics: {
        vision: visionMetrics,
        reasoning: reasoningMetrics,
      },
    };

    // Ensure reference markers are present in the refined prompt so Gemini uses the images
    if (referenceImages.length > 0) {
      const hasMarkers = /\[\d+\]/.test(finalPrompt);
      if (!hasMarkers) {
        const markers = referenceImages.map((_, idx) => `[${idx + 1}]`).join(' ');
        finalPrompt = `${markers} ${finalPrompt}`;
        console.log(`Added reference markers to refined prompt: ${markers}`);
      }
    }
  } else {
    // Without thinking, just add reference markers if needed
    if (referenceImages.length > 0) {
      const hasMarkers = /\[\d+\]/.test(prompt);
      if (!hasMarkers) {
        const markers = referenceImages.map((_, idx) => `[${idx + 1}]`).join(' ');
        finalPrompt = `${markers} ${prompt}`;
      }
    }
  }

  // Build content parts: reference images first, then text prompt
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  // Add reference images as inline data
  for (const img of referenceImages) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  // Add the text prompt
  parts.push({ text: finalPrompt });

  // gemini-3-pro-image-preview supports both aspectRatio and imageSize
  const generationConfig: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: {
      aspectRatio,
      imageSize,
    },
  };

  // Build request body
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig,
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent`;

  console.log('Gemini 3 Pro Image request:', {
    endpoint,
    referenceImageCount: referenceImages.length,
    referenceImageSizes: referenceImages.map((img, i) => ({
      index: i + 1,
      mimeType: img.mimeType,
      base64Length: img.base64.length,
      estimatedKB: Math.round(img.base64.length * 0.75 / 1024),
    })),
    promptPreview: finalPrompt.slice(0, 200),
    partsCount: parts.length,
    aspectRatio,
    imageSize,
    thinking: thinking ? 'enabled (vision + reasoning)' : 'disabled',
  });

  const generationStartTime = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini 3 Pro Image error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText.slice(0, 500),
    });
    throw new Error(
      `Gemini 3 Pro Image API error: ${response.status} - ${errorText.slice(0, 200)}`
    );
  }

  const result = await response.json();

  console.log('Gemini 3 Pro Image response:', {
    hasCandidates: !!result.candidates,
    candidatesCount: result.candidates?.length || 0,
  });

  // Extract image from response
  // Response format: candidates[0].content.parts[] where each part may have inlineData
  const candidate = result.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidates returned from Gemini 3 Pro Image');
  }

  const contentParts = candidate.content?.parts;
  if (!contentParts || !Array.isArray(contentParts)) {
    throw new Error('No content parts in Gemini 3 Pro Image response');
  }

  // Find the image part in the response
  const imagePart = contentParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    console.error('Gemini 3 Pro Image response structure:', {
      candidateKeys: Object.keys(candidate),
      contentKeys: candidate.content ? Object.keys(candidate.content) : 'no content',
      partsCount: contentParts.length,
      partTypes: contentParts.map((p: Record<string, unknown>) => Object.keys(p)),
    });
    throw new Error('No image data in Gemini 3 Pro Image response');
  }

  // Calculate generation timing
  const generationDurationMs = Date.now() - generationStartTime;
  const totalDurationMs = Date.now() - totalStartTime;

  // Add generation and total metrics to thinking chain
  if (thinkingChain) {
    thinkingChain.metrics = {
      ...thinkingChain.metrics,
      generation: { durationMs: generationDurationMs },
      total: { durationMs: totalDurationMs },
    };
    console.log(`Generation complete: ${generationDurationMs}ms. Total pipeline: ${totalDurationMs}ms`);
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
    thinkingChain,
  };
}

/**
 * Check if Gemini 3 Pro Image is configured and available.
 */
export function isGemini3ProConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

// ============================================================================
// Conversational Image Refinement
// ============================================================================

interface RefinementOptions {
  /** The image to refine (base64 encoded) */
  imageBase64: string;
  /** MIME type of the image */
  imageMimeType: string;
  /** Natural language feedback describing desired changes */
  feedback: string;
  /** Optional: The original prompt that generated this image */
  originalPrompt?: string;
  /** Optional: Reference images to maintain consistency */
  referenceImages?: ReferenceImage[];
  /** Aspect ratio for output image. Defaults to '1:1'. */
  aspectRatio?: AspectRatio;
  /** Output image resolution. Defaults to '2K'. */
  imageSize?: ImageSize;
}

interface RefinementResult {
  base64: string;
  mimeType: string;
  metrics: StepMetrics;
}

/**
 * Refine an existing image using conversational feedback.
 * Uses Gemini's multimodal capabilities to understand the image
 * and apply natural language modifications.
 */
export async function refineImageWithFeedback(
  options: RefinementOptions
): Promise<RefinementResult> {
  const {
    imageBase64,
    imageMimeType,
    feedback,
    originalPrompt,
    referenceImages = [],
    aspectRatio = '1:1',
    imageSize = '2K',
  } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  const startTime = Date.now();

  // Build the conversation context
  // Structure: [reference images] + [current image] + [refinement instruction]
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  // Add reference images first (for consistency)
  for (let i = 0; i < referenceImages.length; i++) {
    const ref = referenceImages[i];
    parts.push({
      inlineData: {
        mimeType: ref.mimeType,
        data: ref.base64,
      },
    });
  }

  // Add the current image to refine
  parts.push({
    inlineData: {
      mimeType: imageMimeType,
      data: imageBase64,
    },
  });

  // Build the refinement prompt
  let refinementPrompt = '';

  if (referenceImages.length > 0) {
    const refMarkers = referenceImages.map((_, i) => `[${i + 1}]`).join(', ');
    refinementPrompt += `Reference images: ${refMarkers}\n\n`;
  }

  if (originalPrompt) {
    refinementPrompt += `Original prompt: "${originalPrompt}"\n\n`;
  }

  refinementPrompt += `The last image shown is the current result. Please modify it based on this feedback:\n\n"${feedback}"\n\nGenerate a refined version of the image that addresses this feedback while maintaining the overall composition and subject.`;

  parts.push({ text: refinementPrompt });

  // gemini-3-pro-image-preview supports both aspectRatio and imageSize
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    },
  };

  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent';

  console.log('Gemini refinement request:', {
    endpoint,
    referenceImageCount: referenceImages.length,
    currentImageSize: Math.round(imageBase64.length * 0.75 / 1024) + 'KB',
    feedbackPreview: feedback.slice(0, 100),
    hasOriginalPrompt: !!originalPrompt,
    aspectRatio,
    imageSize,
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini refinement error:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText.slice(0, 500),
    });
    throw new Error(
      `Gemini refinement API error: ${response.status} - ${errorText.slice(0, 200)}`
    );
  }

  const result = await response.json();

  // Extract image from response
  const candidate = result.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidates returned from Gemini refinement');
  }

  const contentParts = candidate.content?.parts;
  if (!contentParts || !Array.isArray(contentParts)) {
    throw new Error('No content parts in Gemini refinement response');
  }

  const imagePart = contentParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    console.error('Gemini refinement response structure:', {
      candidateKeys: Object.keys(candidate),
      contentKeys: candidate.content ? Object.keys(candidate.content) : 'no content',
      partsCount: contentParts.length,
      partTypes: contentParts.map((p: Record<string, unknown>) => Object.keys(p)),
    });
    throw new Error('No image data in Gemini refinement response');
  }

  const durationMs = Date.now() - startTime;
  console.log(`Refinement complete: ${durationMs}ms`);

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
    metrics: { durationMs },
  };
}
