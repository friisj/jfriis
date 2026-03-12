import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/ai/auth';
import { generateWithFlux, type FluxModel, type FluxAspectRatio } from '@/lib/ai/replicate-flux';

const LUV_MEDIA_BUCKET = 'luv-images';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface GenerateRequest {
  prompt: string;
  model?: FluxModel;
  aspectRatio?: FluxAspectRatio;
  seed?: number;
  count?: number;
  /** Which scene triggered generation */
  sceneSlug?: string;
  /** Module slugs in scope */
  moduleSlugs?: string[];
  /** Frozen module parameters at generation time */
  moduleSnapshot?: Record<string, unknown>;
  /** How the prompt was created */
  promptSource?: 'manual' | 'agent' | 'template';
}

interface GenerationResultRow {
  id: string;
  scene_slug: string;
  module_slugs: string[];
  prompt_text: string;
  prompt_source: string;
  storage_path: string;
  provider_config: Record<string, unknown>;
  module_snapshot: Record<string, unknown>;
  created_at: string;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const body = (await request.json()) as GenerateRequest;
    const {
      prompt,
      model = 'flux-2-dev',
      aspectRatio = '1:1',
      seed,
      count = 1,
      sceneSlug = 'prompt-playground',
      moduleSlugs = [],
      moduleSnapshot = {},
      promptSource = 'manual',
    } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const imageCount = Math.max(1, Math.min(4, count));
    const client = serviceClient();
    const results: Array<{
      id: string;
      url: string;
      storagePath: string;
      providerConfig: Record<string, unknown>;
      createdAt: string;
    }> = [];

    for (let i = 0; i < imageCount; i++) {
      const imageSeed = seed !== undefined ? seed + i : undefined;

      const result = await generateWithFlux({
        prompt: prompt.trim(),
        model,
        aspectRatio,
        seed: imageSeed,
      });

      // Upload to Supabase storage
      const storagePath = `playground/${randomUUID()}.png`;
      const { error: uploadError } = await client.storage
        .from(LUV_MEDIA_BUCKET)
        .upload(storagePath, result.buffer, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}`, partialResults: results },
          { status: 500 },
        );
      }

      const providerConfig = {
        model: result.model,
        durationMs: result.durationMs,
        seed: result.seed ?? imageSeed,
        aspectRatio,
      };

      // Persist to luv_generation_results
      const { data: row, error: dbError } = await client
        .from('luv_generation_results')
        .insert({
          scene_slug: sceneSlug,
          module_slugs: moduleSlugs,
          prompt_text: prompt.trim(),
          prompt_source: promptSource,
          storage_path: storagePath,
          provider_config: providerConfig,
          module_snapshot: moduleSnapshot,
        })
        .select()
        .single();

      if (dbError) {
        console.error('[luv/generate] DB insert failed:', dbError);
        // Non-fatal — image was uploaded, just not tracked
      }

      const { data: urlData } = client.storage
        .from(LUV_MEDIA_BUCKET)
        .getPublicUrl(storagePath);

      results.push({
        id: (row as GenerationResultRow | null)?.id ?? randomUUID(),
        url: urlData.publicUrl,
        storagePath,
        providerConfig,
        createdAt: (row as GenerationResultRow | null)?.created_at ?? new Date().toISOString(),
      });
    }

    return NextResponse.json({ images: results });
  } catch (err) {
    console.error('[luv/generate] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
