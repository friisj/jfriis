/**
 * Sampler: Tone.js Sound Synthesis API Route
 *
 * POST /api/sampler/synthesize
 * Takes a text prompt, calls Claude to generate a ToneSynthConfig JSON,
 * creates a sampler_sounds record with type='procedural', returns sound object.
 * No audio file — the config IS the sound.
 */

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';
import { createClient } from '@/lib/supabase-server';

const SynthNoteSchema = z.object({
  time: z.number().describe('Start time in seconds from beginning'),
  note: z.string().describe('Musical note, e.g. "C4", "A#3", "Eb5"'),
  duration: z.number().describe('Note duration in seconds'),
  velocity: z.number().min(0).max(1).optional().describe('Volume 0-1, default 0.8'),
});

const SynthEffectSchema = z.object({
  type: z.enum([
    'reverb', 'delay', 'distortion', 'chorus', 'phaser',
    'tremolo', 'bitcrusher', 'filter', 'autofilter', 'pingpong',
  ]).describe('Effect type'),
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()]))
    .describe('Effect parameters — keys depend on type'),
});

const ToneSynthConfigSchema = z.object({
  synth: z.enum([
    'synth', 'membrane', 'metal', 'noise', 'fm', 'am', 'pluck', 'mono', 'duo',
  ]).describe('Synth type: synth=basic, membrane=kick/drum, metal=cymbal/bell, noise=whoosh/static, fm=complex tones, am=modulated, pluck=guitar/harp, mono=bass/lead, duo=dual voice'),
  params: z.record(z.string(), z.unknown()).optional()
    .describe('Synth-specific params: membrane(pitchDecay,octaves), metal(frequency,harmonicity,modulationIndex,resonance), noise(noiseType:white|pink|brown), fm(harmonicity,modulationIndex), am(harmonicity), pluck(attackNoise,dampening,resonance), mono(filterEnvelope), duo(harmonicity,vibratoAmount,vibratoRate)'),
  oscillator: z.object({
    type: z.enum(['sine', 'square', 'sawtooth', 'triangle', 'fatsine', 'fatsquare', 'fatsawtooth', 'fattriangle', 'pulse', 'pwm'])
      .describe('Waveform shape'),
    partials: z.array(z.number()).optional(),
    spread: z.number().optional().describe('Detuning spread for fat oscillators'),
    count: z.number().optional().describe('Number of voices for fat oscillators'),
  }).optional(),
  envelope: z.object({
    attack: z.number().describe('Attack time in seconds'),
    decay: z.number().describe('Decay time in seconds'),
    sustain: z.number().min(0).max(1).describe('Sustain level 0-1'),
    release: z.number().describe('Release time in seconds'),
  }).optional(),
  effects: z.array(SynthEffectSchema).optional()
    .describe('Effects chain applied in order'),
  notes: z.array(SynthNoteSchema).min(1)
    .describe('Notes to play — for noise/metal synths, note value is ignored but still required'),
  bpm: z.number().optional(),
  duration: z.number().describe('Total sound duration in seconds (should cover all notes + their release/effects tail)'),
});

const SYSTEM_PROMPT = `You are a Tone.js sound designer. Given a text description of a sound, produce a ToneSynthConfig JSON that recreates it using Tone.js synthesizers and effects.

Guidelines:
- Choose the synth type that best matches the sound description
- For percussive sounds: use membrane (kicks, toms), metal (cymbals, bells, hi-hats)
- For tonal sounds: use synth (basic), fm (complex harmonics), am (tremolo-like), mono (basses/leads), duo (rich dual-voice)
- For textures/ambience: use noise with effects, or pluck for string-like sounds
- Shape the sound with envelope (ADSR) — short attack+decay for punchy, long attack for swells
- Use effects creatively: reverb for space, delay for echoes, distortion for grit, chorus for width
- fat oscillator types (fatsine, fatsquare, etc.) with spread create rich detuned sounds
- For a single sound effect (hit, whoosh, beep): use 1-3 notes
- For a short musical phrase or pattern: use more notes with different timings
- Keep total duration reasonable (0.1s for a click, up to 10s for ambient textures)
- For noise synth: still provide notes array but note values are ignored (use "C4" as placeholder)
- For metal synth: note values are ignored (frequency comes from params), but provide notes for timing`;

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
    const { text } = body as { text: string };

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const result = await generateObject({
      model: getModel('claude-sonnet'),
      schema: ToneSynthConfigSchema,
      system: SYSTEM_PROMPT,
      prompt: `Design a Tone.js synth config for: "${text.trim()}"`,
    });

    const config = result.object;

    // Save as procedural sound
    const supabase = await createClient();
    const soundName = text.trim().slice(0, 60) + (text.trim().length > 60 ? '...' : '');

    const { data: sound, error: dbError } = await (supabase as any)
      .from('sampler_sounds')
      .insert({
        name: soundName,
        type: 'procedural',
        source_config: config,
        audio_url: null,
        duration_ms: Math.round(config.duration * 1000),
        tags: ['procedural', 'tone.js', config.synth],
      })
      .select()
      .single();

    if (dbError) {
      console.error('[sampler:synthesize] DB error:', dbError);
      return NextResponse.json(
        { error: 'Failed to create sound record' },
        { status: 500 }
      );
    }

    return NextResponse.json(sound);
  } catch (error) {
    console.error('[sampler:synthesize] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
