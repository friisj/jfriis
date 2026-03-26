import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Default voice — can be overridden per request or via character config
const DEFAULT_VOICE_ID = 'pFZP5JQG7iQjIQuC4Bku'; // Lily
const DEFAULT_MODEL = 'eleven_turbo_v2_5';

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

  const { text, voiceId, stability, style, speed } = (await request.json()) as {
    text: string;
    voiceId?: string;
    stability?: number;
    style?: number;
    speed?: number;
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

  try {
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(
      voiceId ?? DEFAULT_VOICE_ID,
      {
        text: cappedText,
        modelId: DEFAULT_MODEL,
        outputFormat: 'mp3_44100_128',
        voiceSettings: {
          stability: stability ?? 0.4,
          similarityBoost: 0.8,
          style: style ?? 0.5,
          speed: speed ?? 1.0,
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
