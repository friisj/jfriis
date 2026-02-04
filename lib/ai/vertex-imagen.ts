import { GoogleAuth } from 'google-auth-library';

interface ReferenceImage {
  base64: string;
  mimeType: string;
}

interface VertexImagenOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  aspectRatio?: string;
  numberOfImages?: number;
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
  } = options;

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
    }>;
  } = { prompt };

  if (referenceImages.length > 0) {
    instance.referenceImages = referenceImages.map((img, idx) => ({
      referenceId: idx + 1,
      referenceImage: {
        bytesBase64Encoded: img.base64,
      },
      referenceType: 'REFERENCE_TYPE_SUBJECT',
    }));
  }

  const parameters = {
    sampleCount: numberOfImages,
    aspectRatio,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ instances: [instance], parameters }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  const prediction = result.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    throw new Error('No image generated from Vertex AI');
  }

  return {
    base64: prediction.bytesBase64Encoded,
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
