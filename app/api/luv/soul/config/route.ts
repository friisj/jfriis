/**
 * GET  /api/luv/soul/config  — Current trait config for a character/session
 * POST /api/luv/soul/config  — Apply a trait patch or preset
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';
import {
  validateTraitPatch,
  validateTraits,
  applyTraitPatch,
  DEFAULT_TRAITS,
  type SoulModifiedBy,
  type SoulTraits,
  type TraitPatch,
} from '@/lib/luv/soul-modulation';

// ============================================================================
// GET — current config (latest row for character/session)
// ============================================================================

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  const sessionId = searchParams.get('sessionId');

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // Fetch latest config for this character (optionally scoped to session)
  let query = (supabase as any)
    .from('luv_soul_configs')
    .select('*, luv_soul_presets(slug, name)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error: fetchError } = await query.maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }

  // No history yet — return defaults
  if (!data) {
    return NextResponse.json({
      traits: DEFAULT_TRAITS,
      preset: null,
      context: null,
      modified_by: 'system',
      note: 'Default configuration — no history found.',
      isDefault: true,
    });
  }

  return NextResponse.json({
    id: data.id,
    traits: data.traits as SoulTraits,
    preset: data.luv_soul_presets ?? null,
    context: data.context,
    modified_by: data.modified_by,
    note: data.note,
    created_at: data.created_at,
    isDefault: false,
  });
}

// ============================================================================
// POST — apply a trait patch or a full preset
// ============================================================================

interface TraitAdjustBody {
  characterId: string;
  sessionId?: string;
  /** Partial update — only the keys provided are changed */
  patch?: TraitPatch;
  /** Full preset application — all traits replaced with preset values */
  presetId?: string;
  context?: string;
  modified_by?: SoulModifiedBy;
  note?: string;
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = (await request.json()) as TraitAdjustBody;
  const { characterId, sessionId, patch, presetId, context, modified_by, note } = body;

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }
  if (!patch && !presetId) {
    return NextResponse.json({ error: 'Either patch or presetId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  // ── Preset application ────────────────────────────────────────────────────
  if (presetId) {
    const { data: preset, error: presetError } = await (supabase as any)
      .from('luv_soul_presets')
      .select('id, traits, name')
      .eq('id', presetId)
      .single();

    if (presetError || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    const validation = validateTraits(preset.traits);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Preset traits are invalid', details: validation.errors },
        { status: 422 }
      );
    }

    const { data: inserted, error: insertError } = await (supabase as any)
      .from('luv_soul_configs')
      .insert({
        character_id: characterId,
        session_id: sessionId ?? null,
        preset_id: presetId,
        traits: preset.traits,
        context: context ?? null,
        modified_by: 'preset',
        note: note ?? `Applied preset: ${preset.name}`,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: inserted });
  }

  // ── Trait patch ───────────────────────────────────────────────────────────
  if (patch) {
    const patchValidation = validateTraitPatch(patch);
    if (!patchValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid trait patch', details: patchValidation.errors },
        { status: 422 }
      );
    }

    // Fetch current traits to merge against
    const { data: current } = await (supabase as any)
      .from('luv_soul_configs')
      .select('traits')
      .eq('character_id', characterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentTraits: SoulTraits = (current?.traits as SoulTraits) ?? DEFAULT_TRAITS;
    const newTraits = applyTraitPatch(currentTraits, patch);

    const { data: inserted, error: insertError } = await (supabase as any)
      .from('luv_soul_configs')
      .insert({
        character_id: characterId,
        session_id: sessionId ?? null,
        preset_id: null,
        traits: newTraits,
        context: context ?? null,
        modified_by: modified_by ?? 'user',
        note: note ?? null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: inserted });
  }
}
