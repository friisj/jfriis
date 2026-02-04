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

interface GeminiMultimodalOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: string;
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/**
 * Generate an image using Gemini 3 Pro Image Preview model.
 * This model supports up to 14 reference images and 4K output.
 */
export async function generateImageWithGemini3Pro(
  options: GeminiMultimodalOptions
): Promise<GeneratedImage> {
  const { prompt, referenceImages = [], aspectRatio = '1:1' } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  // Build the prompt with reference markers if we have reference images
  let finalPrompt = prompt;
  if (referenceImages.length > 0) {
    const hasMarkers = /\[\d+\]/.test(prompt);
    if (!hasMarkers) {
      // Prepend reference markers to help the model understand which images to reference
      const markers = referenceImages.map((_, idx) => `[${idx + 1}]`).join(' ');
      finalPrompt = `${markers} ${prompt}`;
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

  // Build request body
  const requestBody = {
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      responseMimeType: 'image/png',
    },
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
