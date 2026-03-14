import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/ai/auth';

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface ImportRequest {
  sessionId: string;
  generationResultIds: string[];
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ImportRequest;
    const { sessionId, generationResultIds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    if (!generationResultIds || generationResultIds.length === 0) {
      return NextResponse.json({ error: 'generationResultIds required' }, { status: 400 });
    }

    const client = serviceClient();

    // Fetch the generation results
    const { data: generations, error: genError } = await client
      .from('luv_generation_results')
      .select('id, storage_path, module_slugs')
      .in('id', generationResultIds);

    if (genError) {
      return NextResponse.json({ error: genError.message }, { status: 500 });
    }
    if (!generations || generations.length === 0) {
      return NextResponse.json({ error: 'No matching generation results found' }, { status: 404 });
    }

    // Get max sequence for this session
    const { data: maxRow } = await client
      .from('luv_review_items')
      .select('sequence')
      .eq('session_id', sessionId)
      .order('sequence', { ascending: false })
      .limit(1)
      .single();
    let nextSequence = maxRow ? maxRow.sequence + 1 : 0;

    const results = [];

    for (const gen of generations) {
      const { data: item, error: itemError } = await client
        .from('luv_review_items')
        .insert({
          session_id: sessionId,
          storage_path: gen.storage_path,
          sequence: nextSequence,
          module_links: gen.module_slugs ?? [],
        })
        .select()
        .single();

      if (itemError) {
        return NextResponse.json(
          { error: `DB insert failed: ${itemError.message}` },
          { status: 500 }
        );
      }

      results.push({
        id: item.id,
        sequence: item.sequence,
        storage_path: item.storage_path,
      });

      nextSequence++;
    }

    // Sync image_count from actual item count
    const { count } = await client
      .from('luv_review_items')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    await client
      .from('luv_review_sessions')
      .update({ image_count: count ?? 0 })
      .eq('id', sessionId);

    return NextResponse.json({
      imported: results.length,
      items: results,
    });
  } catch (err) {
    console.error('[luv/review-import] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
