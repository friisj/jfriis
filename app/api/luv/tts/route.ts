import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { getLuvCharacterServer } from '@/lib/luv-server';
import { getCurrentSoulConfigServer } from '@/lib/luv-soul-modulation-server';
import { getVoiceConfig } from '@/lib/luv-voice-config';

// Default voice — can be overridden per request or via character config
const DEFAULT_VOICE_ID = 'NUZ3LH7K9RSuv8Ui6q02';
const DEFAULT_MODEL = 'eleven_flash_v2_5';

/**
 * Strip markdown, tool results, image URLs, and other non-speech content
 * from a message to produce clean dialog text for TTS.
 */
function prepareTextForSpeech(text: string): string {
  let cleaned = text;

  // Remove image markdown: ![alt](url)
  cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');

  // Remove link markdown but keep text: [text](url) → text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove markdown headers: # Title → Title
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  cleaned = cleaned.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

  // Remove code blocks
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove bullet markers
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '');
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove horizontal rules
  cleaned = cleaned.replace(/^---+$/gm, '');

  // Collapse multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim
  cleaned = cleaned.trim();

  return cleaned;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { text, voiceId, speedOverride, traits } = (await request.json()) as {
    text: string;
    voiceId?: string;
    /** Speed override from UI (0.8-1.2) */
    speedOverride?: number;
    /** DSMS soul traits (1-10 scale) — mapped to voice settings */
    traits?: {
      enthusiasm?: number;
      formality?: number;
      charm?: number;
      humor?: number;
    };
  };

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
  }

  const speechText = prepareTextForSpeech(text);
  if (!speechText) {
    return NextResponse.json({ error: 'No speakable text after preprocessing' }, { status: 400 });
  }

  // Cap at ~5000 chars to avoid excessive generation
  const cappedText = speechText.slice(0, 5000);

  // Load stored voice config (voice ID, speed overrides)
  const voiceConfig = await getVoiceConfig(user.id);
  const resolvedVoiceId = voiceId ?? voiceConfig.voiceId ?? DEFAULT_VOICE_ID;
  const resolvedSpeedOverride = speedOverride ?? voiceConfig.speed;

  // Load active DSMS traits if not provided — voice adapts to soul state
  let enthusiasm = traits?.enthusiasm ?? 7;
  let formality = traits?.formality ?? 5;
  let charm = traits?.charm ?? 6;

  if (!traits) {
    try {
      const character = await getLuvCharacterServer();
      if (character?.id) {
        const config = await getCurrentSoulConfigServer(character.id);
        if (config?.traits) {
          enthusiasm = config.traits.enthusiasm ?? enthusiasm;
          formality = config.traits.formality ?? formality;
          charm = config.traits.charm ?? charm;
        }
      }
    } catch {
      // Use defaults if trait loading fails
    }
  }

  // stability: use stored config or derive from traits
  const stability = voiceConfig.stability ?? Math.max(0.15, Math.min(0.85, 0.7 - (enthusiasm / 10) * 0.4 + (formality / 10) * 0.3));
  // style: use stored config or derive from charm
  const style = voiceConfig.style ?? Math.max(0, Math.min(1, (charm / 10) * 0.7 + 0.1));
  // speed: explicit override > stored config > trait-derived
  const speed = resolvedSpeedOverride ?? Math.max(0.75, Math.min(1.15, 0.9 + (enthusiasm - formality) * 0.015));

  try {
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(
      resolvedVoiceId,
      {
        text: cappedText,
        modelId: DEFAULT_MODEL,
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability,
          similarityBoost: 0.8,
          style,
          speed,
          useSpeakerBoost: true,
        },
      }
    );

    // Collect the stream into a buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const audioBuffer = Buffer.concat(chunks);

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[luv/tts] ElevenLabs error:', err);
    const message = err instanceof Error ? err.message : 'TTS generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
