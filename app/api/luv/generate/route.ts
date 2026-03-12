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
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const body = (await request.json()) as GenerateRequest;
    const { prompt, model = 'flux-2-dev', aspectRatio = '1:1', seed, count = 1 } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const imageCount = Math.max(1, Math.min(4, count));
    const client = serviceClient();
    const images: Array<{ url: string; storagePath: string; metadata: Record<string, unknown> }> = [];

    for (let i = 0; i < imageCount; i++) {
      // Use provided seed for first image, random for subsequent
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
          { error: `Upload failed: ${uploadError.message}`, partialImages: images },
          { status: 500 },
        );
      }

      const { data: urlData } = client.storage
        .from(LUV_MEDIA_BUCKET)
        .getPublicUrl(storagePath);

      images.push({
        url: urlData.publicUrl,
        storagePath,
        metadata: {
          model: result.model,
          durationMs: result.durationMs,
          seed: result.seed ?? imageSeed,
          aspectRatio,
        },
      });
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error('[luv/generate] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
