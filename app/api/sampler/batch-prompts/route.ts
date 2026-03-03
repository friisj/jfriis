/**
 * Sampler: Batch Prompt Decomposition API Route
 *
 * POST /api/sampler/batch-prompts
 * Takes a high-level description + count + method, uses Opus to decompose
 * into individual sound prompts for batch generation.
 */

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { z } from 'zod';
import { requireAuth } from '@/lib/ai/auth';
import { checkAIRateLimit, getAIRateLimitHeaders } from '@/lib/ai/rate-limit';
import { getModel } from '@/lib/ai/models';

const BatchPromptsSchema = z.object({
  prompts: z.array(
    z.object({
      index: z.number().describe('0-based index'),
      prompt: z.string().describe('Detailed prompt for generating this individual sound'),
      label: z.string().describe('Short pad label, 1-2 words, e.g. "Kick", "Hi-Hat"'),
    })
  ),
});

const ELEVENLABS_SYSTEM = `You are a sound designer creating prompts for ElevenLabs sound generation.
Given a high-level description and a count, decompose it into individual sound prompts.

Guidelines:
- Each prompt should describe a single, distinct sound effect
- Use vivid acoustic descriptions: materials, textures, environments, actions
- Be specific about the character of each sound (sharp, dull, resonant, dry, etc.)
- Labels should be short (1-2 words) suitable for display on a sampler pad
- Ensure the set covers a coherent, complementary range of sounds
- Order from foundational sounds to accents/embellishments`;

const SYNTH_SYSTEM = `You are a synthesizer sound designer creating prompts for Tone.js procedural synthesis.
Given a high-level description and a count, decompose it into individual synth prompts.

Guidelines:
- Each prompt should describe a single synthesized sound
- Think in terms of synthesis: waveforms, envelopes, modulation, filtering
- Reference synthesis techniques: FM for metallic/bell tones, subtractive for basses, noise for percussion
- Labels should be short (1-2 words) suitable for display on a sampler pad
- Ensure the set covers a coherent, complementary range of sounds
- Order from foundational sounds to accents/embellishments`;

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
    const { description, count, method } = body as {
      description: string;
      count: number;
      method: 'elevenlabs' | 'synth';
    };

    if (!description?.trim()) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    if (!count || count < 1 || count > 32) {
      return NextResponse.json({ error: 'count must be 1-32' }, { status: 400 });
    }

    const systemPrompt = method === 'elevenlabs' ? ELEVENLABS_SYSTEM : SYNTH_SYSTEM;

    const result = await generateObject({
      model: getModel('claude-sonnet'),
      schema: BatchPromptsSchema,
      system: systemPrompt,
      prompt: `Create exactly ${count} individual sound prompts for: "${description.trim()}"`,
    });

    return NextResponse.json(result.object);
  } catch (error) {
    console.error('[sampler:batch-prompts] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
