/**
 * Luv: Image Generation via Gemini Nano Banana Models
 *
 * Server-side image generation using Gemini's native image output,
 * with storage to Supabase and generation tracking.
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const LUV_MEDIA_BUCKET = 'luv-images';

type ImageSize = '1K' | '2K' | '4K';
type AspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9';

const MODEL_IDS = {
  'nano-banana-2': 'gemini-3.1-flash-image-preview',
  'nano-banana-pro': 'gemini-3-pro-image-preview',
} as const;

type ModelAlias = keyof typeof MODEL_IDS;

export interface LuvImageGenOptions {
  prompt: string;
  referenceImages?: { base64: string; mimeType: string }[];
  aspectRatio?: AspectRatio;
  imageSize?: ImageSize;
  model?: ModelAlias;
  /** Pull a prompt template by ID and merge with the provided prompt */
  templateId?: string;
}

export interface LuvImageGenResult {
  storagePath: string;
  publicUrl: string;
  base64: string;
  mimeType: string;
  prompt: string;
  model: string;
  durationMs: number;
}

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Generate an image using Gemini Nano Banana models and save to Supabase storage.
 */
export async function generateLuvImage(options: LuvImageGenOptions): Promise<LuvImageGenResult> {
  const {
    prompt,
    referenceImages = [],
    aspectRatio = '1:1',
    imageSize = '1K',
    model = 'nano-banana-2',
    templateId,
  } = options;

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not configured');
  }

  // Resolve prompt template if provided
  let resolvedPrompt = prompt;
  if (templateId) {
    const client = serviceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error: tplError } = await (client as any)
      .from('luv_prompt_templates')
      .select('template, name')
      .eq('id', templateId)
      .single();

    if (tplError || !template) {
      console.warn('[luv-image-gen] Template not found:', templateId);
    } else {
      // Merge: template provides structure, user prompt provides specifics
      resolvedPrompt = `${template.template}\n\nSpecific request: ${prompt}`;
      console.log('[luv-image-gen] Applied template:', template.name);
    }
  }

  const modelId = MODEL_IDS[model];
  const startTime = Date.now();

  // Build content parts: reference images first, then text prompt
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  for (const img of referenceImages) {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    });
  }

  // Add reference markers if images present
  let finalPrompt = resolvedPrompt;
  if (referenceImages.length > 0 && !/\[\d+\]/.test(resolvedPrompt)) {
    const markers = referenceImages.map((_, i) => `[${i + 1}]`).join(' ');
    finalPrompt = `${markers} ${resolvedPrompt}`;
  }

  parts.push({ text: finalPrompt });

  // generationConfig structure matches the proven pattern in lib/ai/gemini-multimodal.ts
  // (used by Cognitron pipeline for gemini-3-pro-image-preview)
  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['IMAGE', 'TEXT'],
      imageConfig: { aspectRatio, imageSize },
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;

  console.log('[luv-image-gen] Request:', {
    model: modelId,
    referenceImageCount: referenceImages.length,
    aspectRatio,
    imageSize,
    promptPreview: finalPrompt.slice(0, 100),
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
    console.error('[luv-image-gen] API error:', { status: response.status, body: errorText.slice(0, 300) });
    throw new Error(`Image generation failed: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  const result = await response.json();

  // Extract image from response parts
  const contentParts = result.candidates?.[0]?.content?.parts;
  if (!contentParts || !Array.isArray(contentParts)) {
    throw new Error('No content parts in image generation response');
  }

  const imagePart = contentParts.find(
    (part: { inlineData?: { mimeType: string; data: string } }) =>
      part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData) {
    // Check for text-only response (may contain refusal or error)
    const textPart = contentParts.find((p: { text?: string }) => p.text);
    const reason = textPart?.text || 'Unknown reason';
    throw new Error(`No image generated: ${reason}`);
  }

  const durationMs = Date.now() - startTime;
  const { data: base64Data, mimeType } = imagePart.inlineData;
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';

  // Upload to Supabase storage
  const storagePath = `generations/${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(base64Data, 'base64');
  const client = serviceClient();

  const { error: uploadError } = await client.storage
    .from(LUV_MEDIA_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LUV_MEDIA_BUCKET}/${storagePath}`;

  // Record in luv_generation_results (non-fatal — image is already in storage)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (client as any)
    .from('luv_generation_results')
    .insert({
      scene_slug: 'agent-generation',
      module_slugs: [],
      prompt_text: finalPrompt,
      prompt_source: 'agent',
      storage_path: storagePath,
      provider_config: {
        model: modelId,
        aspectRatio,
        imageSize,
        durationMs,
        referenceImageCount: referenceImages.length,
      },
      module_snapshot: {},
    });

  if (dbError) {
    console.error('[luv-image-gen] DB insert failed:', dbError);
  }

  console.log('[luv-image-gen] Complete:', { storagePath, durationMs, model: modelId });

  return {
    storagePath,
    publicUrl,
    base64: base64Data,
    mimeType,
    prompt: finalPrompt,
    model: modelId,
    durationMs,
  };
}

/**
 * List recent image generations.
 */
export async function listLuvGenerations(limit = 10) {
  const client = serviceClient();
  const { data, error } = await client
    .from('luv_generation_results')
    .select('id, scene_slug, prompt_text, prompt_source, storage_path, provider_config, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list generations: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LUV_MEDIA_BUCKET}/${row.storage_path}`,
  }));
}
