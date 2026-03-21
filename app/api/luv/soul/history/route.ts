/**
 * GET /api/luv/soul/history — Trait configuration change history
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  const sessionId = searchParams.get('sessionId');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  if (!characterId) {
    return NextResponse.json({ error: 'characterId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  let query = (supabase as any)
    .from('luv_soul_configs')
    .select('id, traits, preset_id, context, modified_by, note, created_at, luv_soul_presets(slug, name)')
    .eq('character_id', characterId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}
