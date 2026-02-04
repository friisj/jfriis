import { GoogleAuth } from 'google-auth-library';
import https from 'https';

type SubjectType =
  | 'SUBJECT_TYPE_PERSON'
  | 'SUBJECT_TYPE_ANIMAL'
  | 'SUBJECT_TYPE_PRODUCT';

interface ReferenceImage {
  base64: string;
  mimeType: string;
  subjectType?: SubjectType;
  subjectDescription?: string;
}

interface VertexImagenOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: string;
  numberOfImages?: number;
  defaultSubjectType?: SubjectType;
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/**
 * Get GoogleAuth instance configured for the environment.
 * Supports two modes:
 * - Local: GOOGLE_APPLICATION_CREDENTIALS file path
 * - Production: GOOGLE_SERVICE_ACCOUNT_KEY JSON string (for Vercel)
 */
function getAuthClient(): GoogleAuth {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    // Production: parse JSON from environment variable
    const credentials = JSON.parse(serviceAccountKey);
    return new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  // Local development: use GOOGLE_APPLICATION_CREDENTIALS file
  return new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
}

/**
 * Generate an image using Vertex AI's Imagen 3 Capability model.
 * This model supports subject customization with reference images.
 *
 * Requires:
 * - GOOGLE_VERTEX_PROJECT_ID env var
 * - GOOGLE_VERTEX_LOCATION env var (defaults to us-central1)
 * - Either GOOGLE_APPLICATION_CREDENTIALS (file path) or GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)
 */
export async function generateImageWithVertex(
  options: VertexImagenOptions
): Promise<GeneratedImage> {
  const {
    prompt,
    referenceImages = [],
    aspectRatio = '1:1',
    numberOfImages = 1,
    defaultSubjectType = 'SUBJECT_TYPE_PERSON',
  } = options;

  // Ensure prompt includes reference markers [1], [2], etc. for each reference image
  let finalPrompt = prompt;
  if (referenceImages.length > 0) {
    // Check if prompt already contains reference markers
    const hasMarkers = /\[\d+\]/.test(prompt);
    if (!hasMarkers) {
      // Prepend reference markers to the prompt
      const markers = referenceImages.map((_, idx) => `[${idx + 1}]`).join(' ');
      finalPrompt = `${markers} ${prompt}`;
      console.log('Added reference markers to prompt:', finalPrompt.slice(0, 100));
    }
  }

  const projectId = process.env.GOOGLE_VERTEX_PROJECT_ID;
  const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';

  if (!projectId) {
    throw new Error('GOOGLE_VERTEX_PROJECT_ID not configured');
  }

  // Get access token via service account
  const auth = getAuthClient();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  if (!accessToken.token) {
    throw new Error('Failed to obtain access token for Vertex AI');
  }

  // Build request for imagen-3.0-capability-001 with subject references
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-capability-001:predict`;

  // Build instance with optional reference images
  const instance: {
    prompt: string;
    referenceImages?: Array<{
      referenceId: number;
      referenceImage: { bytesBase64Encoded: string };
      referenceType: string;
      subjectImageConfig: {
        subjectType: string;
        subjectDescription: string;
      };
    }>;
  } = { prompt: finalPrompt };

  if (referenceImages.length > 0) {
    instance.referenceImages = referenceImages.map((img, idx) => ({
      referenceId: idx + 1,
      referenceImage: {
        bytesBase64Encoded: img.base64,
      },
      referenceType: 'REFERENCE_TYPE_SUBJECT',
      subjectImageConfig: {
        subjectType: img.subjectType || defaultSubjectType,
        // Use provided description or a descriptive default
        subjectDescription: img.subjectDescription || `the person in reference image ${idx + 1}`,
      },
    }));
  }

  console.log('Reference image configs:', instance.referenceImages?.map(ri => ({
    referenceId: ri.referenceId,
    subjectType: ri.subjectImageConfig.subjectType,
    subjectDescription: ri.subjectImageConfig.subjectDescription,
    // Verify base64 is valid image data (PNG starts with iVBOR, JPEG with /9j/)
    base64Prefix: ri.referenceImage.bytesBase64Encoded.slice(0, 20),
    base64Length: ri.referenceImage.bytesBase64Encoded.length,
  })));

  console.log('Final prompt being sent:', finalPrompt);

  const parameters = {
    sampleCount: numberOfImages,
    aspectRatio,
    // Allow person generation (default for capability model, but explicit to be safe)
    personGeneration: 'allow_all',
    // Lower safety threshold to reduce silent blocks
    safetySetting: 'block_only_high',
  };

  const requestPayload = { instances: [instance], parameters };
  const requestBody = JSON.stringify(requestPayload);

  // Log image sizes for debugging
  const imageSizes = referenceImages.map((img, idx) => ({
    index: idx + 1,
    base64Length: img.base64.length,
    estimatedSizeKB: Math.round(img.base64.length * 0.75 / 1024),
  }));

  // Log structure WITHOUT the actual base64 data
  const debugPayload = {
    instances: [{
      prompt: finalPrompt,
      referenceImages: instance.referenceImages?.map(ri => ({
        referenceType: ri.referenceType,
        referenceId: ri.referenceId,
        subjectImageConfig: ri.subjectImageConfig,
        imageDataLength: ri.referenceImage.bytesBase64Encoded.length,
      }))
    }],
    parameters,
  };

  console.log('Vertex AI request:', {
    endpoint,
    requestBodySizeKB: Math.round(requestBody.length / 1024),
    imageSizes,
    debugPayload: JSON.stringify(debugPayload, null, 2),
  });

  // Use native https module for large payloads (Next.js fetch can have issues)
  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const responseText = Buffer.concat(chunks).toString('utf-8');
        console.log('Vertex AI raw response:', {
          status: res.statusCode,
          statusMessage: res.statusMessage,
          bodyLength: responseText.length,
          bodyPreview: responseText.slice(0, 500),
        });

        if (res.statusCode !== 200) {
          reject(new Error(`Vertex AI error: ${res.statusCode} - ${responseText}`));
          return;
        }

        try {
          resolve(responseText ? JSON.parse(responseText) : {});
        } catch (e) {
          reject(new Error(`Failed to parse Vertex AI response: ${responseText.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Vertex AI request failed: ${e.message}`));
    });

    req.write(requestBody);
    req.end();
  });
  // Don't log full response (contains huge base64 data)
  const predictions = result.predictions as Array<Record<string, unknown>> | undefined;
  console.log('Vertex AI parsed response:', {
    hasPredictions: !!predictions,
    predictionsCount: Array.isArray(predictions) ? predictions.length : 0,
  });

  const prediction = predictions?.[0];

  // Handle multiple possible response formats
  let base64Image: string | undefined;

  if (prediction?.bytesBase64Encoded) {
    // Format 1: Direct bytesBase64Encoded on prediction
    base64Image = prediction.bytesBase64Encoded as string;
  } else if ((prediction?.image as Record<string, unknown> | undefined)?.bytesBase64Encoded) {
    // Format 2: Nested under image object
    base64Image = (prediction?.image as Record<string, unknown>)?.bytesBase64Encoded as string;
  } else if ((prediction?.generatedImages as Array<Record<string, unknown>> | undefined)?.[0]?.bytesBase64Encoded) {
    // Format 3: Array of generated images
    base64Image = (prediction?.generatedImages as Array<Record<string, unknown>>)?.[0]?.bytesBase64Encoded as string;
  }

  if (!base64Image) {
    // Log the actual structure we received for debugging
    console.error('Vertex AI response structure:', {
      hasPredictions: !!predictions,
      predictionsLength: predictions?.length,
      predictionKeys: prediction ? Object.keys(prediction) : 'no prediction',
      fullResponse: result,
    });
    // Include full response in error for debugging
    const responsePreview = JSON.stringify(result).slice(0, 500);
    throw new Error(
      `No image generated from Vertex AI. Response: ${responsePreview}`
    );
  }

  return {
    base64: base64Image,
    mimeType: 'image/png',
  };
}

/**
 * Check if Vertex AI is properly configured for use.
 * Returns true if project ID is set and credentials are available
 * (either via file path or JSON string).
 */
export function isVertexConfigured(): boolean {
  const hasProjectId = !!process.env.GOOGLE_VERTEX_PROJECT_ID;
  const hasCredentials = !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  );
  return hasProjectId && hasCredentials;
}
