/**
 * Sampler: Sound Generation API Route
 *
 * POST /api/sampler/generate
 * Proxies to ElevenLabs sound generation, saves mp3 to sampler-audio bucket,
 * creates sampler_sounds record, returns sound object.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAuth();
    if (!user || authError) {
      return NextResponse.json({ error: 'Unauthorized', detail: authError }, { status: 401 });
    }

    const rateLimitResult = await checkAIRateLimit(user.id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getAIRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { text, duration_seconds, prompt_influence } = body as {
      text: string;
      duration_seconds?: number;
      prompt_influence?: number;
    };

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Call ElevenLabs sound generation
    const elResponse = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        duration_seconds: duration_seconds ?? undefined,
        prompt_influence: prompt_influence ?? 0.3,
      }),
    });

    if (!elResponse.ok) {
      const errText = await elResponse.text();
      console.error('[sampler:generate] ElevenLabs error:', errText);
      let message = 'Sound generation failed';
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.detail?.status === 'missing_permissions') {
          message = 'ElevenLabs API key missing sound_generation permission';
        } else if (parsed?.detail?.message) {
          message = parsed.detail.message;
        }
      } catch { /* use default message */ }
      return NextResponse.json(
        { error: message },
        { status: 502 }
      );
    }

    const audioBlob = await elResponse.blob();
    const audioBuffer = await audioBlob.arrayBuffer();

    // Upload to Supabase storage
    const filename = `generated-${Date.now()}.mp3`;
    const supabase = await createClient();

    const { error: uploadError } = await supabase.storage
      .from('sampler-audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[sampler:generate] Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload audio' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('sampler-audio')
      .getPublicUrl(filename);

    // Create sound record
    const soundName = text.slice(0, 60) + (text.length > 60 ? '...' : '');
    const { data: sound, error: dbError } = await (supabase as any)
      .from('sampler_sounds')
      .insert({
        name: soundName,
        type: 'generated',
        source_config: { text, duration_seconds, prompt_influence },
        audio_url: urlData.publicUrl,
        tags: ['elevenlabs', 'generated'],
      })
      .select()
      .single();

    if (dbError) {
      console.error('[sampler:generate] DB error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create sound record' },
        { status: 500 }
      );
    }

    return NextResponse.json(sound);
  } catch (error) {
    console.error('[sampler:generate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
