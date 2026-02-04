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

interface GeminiMultimodalOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: string;
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

interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/**
 * Analyze reference images using Gemini's vision capabilities.
 * Returns detailed descriptions of each image for use in prompt refinement.
 */
async function analyzeReferenceImages(
  referenceImages: ReferenceImage[],
  apiKey: string
): Promise<string[]> {
  const descriptions: string[] = [];

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

  return descriptions;
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
): Promise<string> {
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

  const reasoningPrompt = `You are an expert photographer and art director preparing a prompt for AI image generation.

${referenceContext}${shootContext}
Original Prompt: "${originalPrompt}"

Your task: Create an optimized, detailed prompt for the image generation model that:
1. Incorporates the visual style, lighting, and mood from reference images (if provided)
2. Applies the shoot parameters for technical direction
3. Maintains the core intent of the original prompt
4. Adds specific details about composition, lighting, colors, and atmosphere
5. Uses clear, descriptive language that image models understand well

Important guidelines:
- Be specific about lighting (direction, quality, color temperature)
- Describe the desired composition and framing
- Include details about textures, materials, and surfaces
- Specify the mood and atmosphere
- If references show a person, describe how to maintain their likeness
- Keep the prompt focused and coherent (under 300 words)

Output ONLY the refined prompt, nothing else.`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: reasoningPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
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
      console.error('Prompt refinement failed:', await response.text());
      return originalPrompt;
    }

    const result = await response.json();
    const refinedPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (refinedPrompt) {
      console.log('Prompt refinement complete:', {
        originalLength: originalPrompt.length,
        refinedLength: refinedPrompt.length,
        preview: refinedPrompt.slice(0, 150) + '...',
      });
      return refinedPrompt;
    }

    return originalPrompt;
  } catch (error) {
    console.error('Prompt refinement error:', error);
    return originalPrompt;
  }
}

/**
 * Generate an image using Gemini 3 Pro Image Preview model.
 * This model supports up to 14 reference images and 4K output.
 */
export async function generateImageWithGemini3Pro(
  options: GeminiMultimodalOptions
): Promise<GeneratedImage> {
  const { prompt, referenceImages = [], aspectRatio = '1:1', thinking, shootParams } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  // If thinking is enabled, use vision + reasoning pipeline
  let finalPrompt = prompt;
  if (thinking) {
    console.log('Thinking mode enabled - running vision + reasoning pipeline');

    // Step 1: Analyze reference images with vision (if any)
    let referenceDescriptions: string[] = [];
    if (referenceImages.length > 0) {
      console.log(`Analyzing ${referenceImages.length} reference images...`);
      referenceDescriptions = await analyzeReferenceImages(referenceImages, apiKey);
    }

    // Step 2: Refine prompt with LLM reasoning
    console.log('Refining prompt with LLM reasoning...');
    finalPrompt = await refinePromptWithReasoning(
      prompt,
      referenceDescriptions,
      shootParams,
      apiKey
    );
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

  const generationConfig: Record<string, unknown> = {
    responseModalities: ['IMAGE', 'TEXT'],
  };

  // Build request body
  // Note: responseModalities controls output type, NOT responseMimeType
  // responseMimeType is for text formats only (json, xml, etc.)
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig,
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent`;

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
    thinking: thinking ? 'enabled (vision + reasoning)' : 'disabled',
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

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

/**
 * Check if Gemini 3 Pro Image is configured and available.
 */
export function isGemini3ProConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
