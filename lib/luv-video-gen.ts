/**
 * Luv: Video Generation (Veo + Grok backends)
 *
 * Two-phase async pattern:
 *   1. submitVideoJob()  — POST to provider, insert luv_video_jobs row, return job UUID
 *   2. pollVideoJob()    — GET provider status, on completion download + store in Supabase
 *
 * Both providers support image-to-video (i2v). Reference images are resolved via the
 * same resolveReferenceImages() used by generate_image, keeping the agent's interface
 * consistent.
 *
 * Env vars:
 *   GOOGLE_GENERATIVE_AI_API_KEY — required for Veo
 *   XAI_API_KEY                  — required for Grok
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VideoProvider = 'veo' | 'grok';
export type VideoAspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p' | '4K';
export type VeoDuration = 4 | 6 | 8;
export type GrokDuration = number; // 1–15 seconds

export interface VideoJobOptions {
  provider: VideoProvider;
  prompt: string;
  referenceImage?: { base64: string; mimeType: string }; // i2v: first-frame conditioning
  aspectRatio?: VideoAspectRatio;
  durationSeconds?: number;
  resolution?: VideoResolution;
  /** Veo model alias */
  veoModel?: 'veo-3.0' | 'veo-3.1';
}

export interface VideoJobRecord {
  id: string;
  provider: VideoProvider;
  externalId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  prompt: string;
  storageUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COG_BUCKET = 'cog-images';

/** GA model IDs for Gemini API */
const VEO_MODELS: Record<string, string> = {
  'veo-3.0': 'veo-3.0-generate-001',
  'veo-3.1': 'veo-3.1-generate-001',
};
const VEO_DEFAULT = 'veo-3.0';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const XAI_BASE = 'https://api.x.ai/v1';

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function insertJobRow(
  provider: VideoProvider,
  externalId: string,
  opts: VideoJobOptions,
): Promise<string> {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('luv_video_jobs')
    .insert({
      provider,
      external_id: externalId,
      prompt: opts.prompt,
      aspect_ratio: opts.aspectRatio ?? '16:9',
      duration_seconds: opts.durationSeconds,
      resolution: opts.resolution ?? '720p',
      model: opts.veoModel ?? (provider === 'veo' ? VEO_DEFAULT : 'grok-imagine-video'),
      reference_image_count: opts.referenceImage ? 1 : 0,
      status: 'pending',
      provider_config: { provider },
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert video job: ${error.message}`);
  return data.id as string;
}

async function updateJobRow(
  jobId: string,
  patch: {
    status?: string;
    error_message?: string;
    storage_path?: string;
    cog_image_id?: string | null;
    cog_series_id?: string | null;
    duration_ms?: number;
  },
) {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (client as any)
    .from('luv_video_jobs')
    .update(patch)
    .eq('id', jobId);

  if (error) console.error('[luv-video-gen] updateJobRow failed:', error.message);
}

async function getJobRow(jobId: string): Promise<Record<string, unknown> | null> {
  const client = serviceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (client as any)
    .from('luv_video_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return null;
  return data;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function uploadVideoToSupabase(
  videoBytes: Buffer,
  mimeType: string,
): Promise<string> {
  const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
  const storagePath = `luv/videos/${Date.now()}-${randomUUID()}.${ext}`;
  const client = serviceClient();

  const { error } = await client.storage
    .from(COG_BUCKET)
    .upload(storagePath, videoBytes, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Video storage upload failed: ${error.message}`);
  return storagePath;
}

function publicUrl(storagePath: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${COG_BUCKET}/${storagePath}`;
}

async function recordCogVideo(
  storagePath: string,
  prompt: string,
  provider: string,
  meta: Record<string, unknown>,
): Promise<{ id: string | null; seriesId: string | null }> {
  try {
    const { createLuvCogImageServer } = await import('./luv/cog-integration-server');
    const cogImage = await createLuvCogImageServer({
      seriesKey: 'videos',
      storagePath,
      filename: storagePath.split('/').pop()!,
      mimeType: storagePath.endsWith('.webm') ? 'video/webm' : 'video/mp4',
      source: 'generated',
      prompt,
      metadata: { provider, ...meta },
    });
    return { id: cogImage.id, seriesId: cogImage.series_id };
  } catch (err) {
    console.error('[luv-video-gen] cog_images insert failed:', err);
    return { id: null, seriesId: null };
  }
}

// ---------------------------------------------------------------------------
// Veo backend
// ---------------------------------------------------------------------------

async function submitVeo(opts: VideoJobOptions): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const modelId = VEO_MODELS[opts.veoModel ?? VEO_DEFAULT];
  const endpoint = `${GEMINI_BASE}/models/${modelId}:predictLongRunning`;

  // Build video generation parameters
  const videoConfig: Record<string, unknown> = {
    durationSeconds: opts.durationSeconds ?? 6,
    aspectRatio: opts.aspectRatio ?? '16:9',
    resolution: opts.resolution ?? '720p',
    personGeneration: 'allow_adult',
  };

  const requestBody: Record<string, unknown> = {
    model: `models/${modelId}`,
    instances: [
      {
        prompt: opts.prompt,
        // i2v: Gemini API uses referenceImages with inlineData (not bytesBase64Encoded)
        ...(opts.referenceImage
          ? {
              referenceImages: [
                {
                  image: {
                    inlineData: {
                      mimeType: opts.referenceImage.mimeType,
                      data: opts.referenceImage.base64,
                    },
                  },
                  referenceType: 'asset',
                },
              ],
            }
          : {}),
      },
    ],
    parameters: videoConfig,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Veo submit failed: ${res.status} — ${body.slice(0, 300)}`);
  }

  const json = await res.json();
  const operationName = json.name as string;
  if (!operationName) throw new Error('Veo response missing operation name');

  console.log('[luv-video-gen] Veo job submitted:', operationName);
  return operationName;
}

async function pollVeo(
  operationName: string,
): Promise<{ done: boolean; videoUri?: string; error?: string }> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  const endpoint = `${GEMINI_BASE}/${operationName}`;
  const res = await fetch(endpoint, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Veo poll failed: ${res.status} — ${body.slice(0, 200)}`);
  }

  const json = await res.json();

  if (!json.done) return { done: false };

  if (json.error) {
    return { done: true, error: json.error.message ?? 'Veo generation failed' };
  }

  // Gemini API Veo response: response.videos[0].gcsUri (gs://... URI)
  const uri = json.response?.videos?.[0]?.gcsUri as string | undefined;
  if (!uri) return { done: true, error: 'Veo: no video URI in response' };

  return { done: true, videoUri: uri };
}

async function fetchVeoVideo(videoUri: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');

  // Veo (Gemini API) returns a gs:// URI pointing to a GCS bucket.
  // Downloading requires either:
  //   A) GOOGLE_SERVICE_ACCOUNT_KEY (not in env) for private buckets
  //   B) The bucket is world-readable — try public HTTPS URL first
  //
  // If the bucket is private and no service account is configured, generation
  // will succeed but download will fail here with a 403/404.
  let downloadUrl: string;
  if (videoUri.startsWith('gs://')) {
    // Convert gs://bucket/path → https://storage.googleapis.com/bucket/path
    downloadUrl = videoUri.replace('gs://', 'https://storage.googleapis.com/');
  } else {
    // HTTPS URI (Files API format) — auth via header
    downloadUrl = videoUri;
  }

  const res = await fetch(downloadUrl, {
    headers: { 'x-goog-api-key': apiKey },
  });

  if (!res.ok) {
    if (res.status === 403 || res.status === 401) {
      throw new Error(
        `Veo video download failed (${res.status}): GCS bucket requires service account credentials. ` +
        `Add GOOGLE_SERVICE_ACCOUNT_KEY to env to enable Veo video downloads.`
      );
    }
    throw new Error(`Failed to fetch Veo video: ${res.status}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Grok backend
// ---------------------------------------------------------------------------

async function submitGrok(opts: VideoJobOptions): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not configured');

  const body: Record<string, unknown> = {
    model: 'grok-imagine-video',
    prompt: opts.prompt,
    duration: opts.durationSeconds ?? 5,
    aspect_ratio: opts.aspectRatio ?? '16:9',
    resolution: opts.resolution === '4K' ? '720p' : (opts.resolution ?? '720p'), // Grok max is 720p
  };

  if (opts.referenceImage) {
    const dataUrl = `data:${opts.referenceImage.mimeType};base64,${opts.referenceImage.base64}`;
    body.image = dataUrl;
  }

  const res = await fetch(`${XAI_BASE}/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Grok submit failed: ${res.status} — ${errBody.slice(0, 300)}`);
  }

  const json = await res.json();
  const requestId = json.request_id as string | undefined;
  if (!requestId) throw new Error('Grok response missing request_id');

  console.log('[luv-video-gen] Grok job submitted:', requestId);
  return requestId;
}

async function pollGrok(
  requestId: string,
): Promise<{ done: boolean; videoUrl?: string; error?: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not configured');

  const res = await fetch(`${XAI_BASE}/videos/${requestId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok poll failed: ${res.status} — ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const status = json.status as string;

  if (status === 'pending' || status === 'processing') return { done: false };
  if (status === 'failed') return { done: true, error: json.error ?? 'Grok generation failed' };
  if (status === 'expired') return { done: true, error: 'Grok: job expired before retrieval' };

  const videoUrl = json.video_url as string | undefined;
  if (!videoUrl) return { done: true, error: 'Grok: no video_url in completed response' };

  return { done: true, videoUrl };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit a video generation job. Returns the luv_video_jobs UUID.
 * The job starts as 'pending'; use checkVideoJob() to poll for completion.
 */
export async function submitVideoJob(opts: VideoJobOptions): Promise<string> {
  let externalId: string;

  if (opts.provider === 'veo') {
    externalId = await submitVeo(opts);
  } else {
    externalId = await submitGrok(opts);
  }

  const jobId = await insertJobRow(opts.provider, externalId, opts);
  console.log('[luv-video-gen] Job created:', { jobId, provider: opts.provider });
  return jobId;
}

/**
 * Poll a job for completion. On success, downloads the video and stores it in Supabase.
 * Returns the current job state.
 */
export async function checkVideoJob(jobId: string): Promise<VideoJobRecord> {
  const row = await getJobRow(jobId);
  if (!row) throw new Error(`Video job not found: ${jobId}`);

  const provider = row.provider as VideoProvider;
  const externalId = row.external_id as string;
  const currentStatus = row.status as string;

  // Already terminal
  if (currentStatus === 'completed' || currentStatus === 'failed') {
    return rowToRecord(row);
  }

  // Mark processing on first poll after pending
  if (currentStatus === 'pending') {
    await updateJobRow(jobId, { status: 'processing' });
  }

  const startTime = Date.now();

  try {
    if (provider === 'veo') {
      const poll = await pollVeo(externalId);

      if (!poll.done) {
        return { ...rowToRecord(row), status: 'processing' };
      }

      if (poll.error) {
        await updateJobRow(jobId, { status: 'failed', error_message: poll.error });
        return { ...rowToRecord(row), status: 'failed', errorMessage: poll.error };
      }

      // Download and store
      const videoBytes = await fetchVeoVideo(poll.videoUri!);
      const storagePath = await uploadVideoToSupabase(videoBytes, 'video/mp4');
      const durationMs = Date.now() - startTime;
      const { id: cogId, seriesId: cogSeriesId } = await recordCogVideo(
        storagePath,
        row.prompt as string,
        'veo',
        { externalId, durationMs },
      );

      await updateJobRow(jobId, {
        status: 'completed',
        storage_path: storagePath,
        cog_image_id: cogId,
        cog_series_id: cogSeriesId,
        duration_ms: durationMs,
      });

      return {
        id: jobId,
        provider: 'veo',
        externalId,
        status: 'completed',
        prompt: row.prompt as string,
        storageUrl: publicUrl(storagePath),
        durationMs,
      };
    } else {
      // Grok
      const poll = await pollGrok(externalId);

      if (!poll.done) {
        return { ...rowToRecord(row), status: 'processing' };
      }

      if (poll.error) {
        await updateJobRow(jobId, { status: 'failed', error_message: poll.error });
        return { ...rowToRecord(row), status: 'failed', errorMessage: poll.error };
      }

      // Download from Grok's CDN and store in Supabase
      const videoRes = await fetch(poll.videoUrl!);
      if (!videoRes.ok) throw new Error(`Failed to fetch Grok video: ${videoRes.status}`);
      const videoBytes = Buffer.from(await videoRes.arrayBuffer());

      const storagePath = await uploadVideoToSupabase(videoBytes, 'video/mp4');
      const durationMs = Date.now() - startTime;
      const { id: cogId, seriesId: cogSeriesId } = await recordCogVideo(
        storagePath,
        row.prompt as string,
        'grok',
        { externalId, durationMs },
      );

      await updateJobRow(jobId, {
        status: 'completed',
        storage_path: storagePath,
        cog_image_id: cogId,
        cog_series_id: cogSeriesId,
        duration_ms: durationMs,
      });

      return {
        id: jobId,
        provider: 'grok',
        externalId,
        status: 'completed',
        prompt: row.prompt as string,
        storageUrl: publicUrl(storagePath),
        durationMs,
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await updateJobRow(jobId, { status: 'failed', error_message: msg });
    return { ...rowToRecord(row), status: 'failed', errorMessage: msg };
  }
}

function rowToRecord(row: Record<string, unknown>): VideoJobRecord {
  return {
    id: row.id as string,
    provider: row.provider as VideoProvider,
    externalId: row.external_id as string,
    status: row.status as VideoJobRecord['status'],
    prompt: row.prompt as string,
    storageUrl: row.storage_path
      ? publicUrl(row.storage_path as string)
      : undefined,
    errorMessage: row.error_message as string | undefined,
    durationMs: row.duration_ms as number | undefined,
  };
}
