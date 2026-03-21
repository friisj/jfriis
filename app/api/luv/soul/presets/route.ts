/**
 * GET  /api/luv/soul/presets        — List all presets
 * POST /api/luv/soul/presets        — Create a custom preset
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { createClient } from '@/lib/supabase-server';
import { validateTraits } from '@/lib/luv/soul-modulation';

export async function GET() {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const supabase = await createClient();
  const { data, error: fetchError } = await (supabase as any)
    .from('luv_soul_presets')
    .select('id, slug, name, description, traits, is_default, updated_at')
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }

  return NextResponse.json({ presets: data });
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await request.json();
  const { slug, name, description, traits } = body as {
    slug: string;
    name: string;
    description?: string;
    traits: unknown;
  };

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
  }

  const validation = validateTraits(traits);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Invalid traits', details: validation.errors },
      { status: 422 }
    );
  }

  const supabase = await createClient();

  // Check for duplicate slug
  const { data: existing } = await (supabase as any)
    .from('luv_soul_presets')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: `Preset with slug "${slug}" already exists` }, { status: 409 });
  }

  const { data, error: insertError } = await (supabase as any)
    .from('luv_soul_presets')
    .insert({ slug, name, description: description ?? null, traits, is_default: false })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }

  return NextResponse.json({ success: true, preset: data }, { status: 201 });
}
