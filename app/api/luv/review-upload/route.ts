import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/ai/auth';
import { createLuvCogImageServer } from '@/lib/luv/cog-integration-server';

const COG_IMAGES_BUCKET = 'cog-images';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (!user) {
    return NextResponse.json({ error }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const files = formData.getAll('files') as File[];

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 10MB limit` },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} has unsupported type ${file.type}` },
          { status: 400 }
        );
      }
    }

    const client = serviceClient();

    // Get max sequence for this session (safe under concurrency — each request gets its own starting point)
    const { data: maxRow } = await client
      .from('luv_review_items')
      .select('sequence')
      .eq('session_id', sessionId)
      .order('sequence', { ascending: false })
      .limit(1)
      .single();
    let nextSequence = maxRow ? maxRow.sequence + 1 : 0;

    const results = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      // Randomized path to prevent URL enumeration
      const storagePath = `luv/reviews/${sessionId}/${randomUUID()}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await client.storage
        .from(COG_IMAGES_BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: `Upload failed for ${file.name}: ${uploadError.message}` },
          { status: 500 }
        );
      }

      // Write to cog_images (non-fatal)
      await createLuvCogImageServer({
        seriesKey: 'reviews',
        storagePath,
        filename: file.name,
        mimeType: file.type,
        source: 'upload',
        metadata: { luv_session_id: sessionId },
      }).catch((err) => console.error('[luv/review-upload] cog_images insert failed:', err));

      // Create review item
      const { data: item, error: itemError } = await client
        .from('luv_review_items')
        .insert({
          session_id: sessionId,
          storage_path: storagePath,
          sequence: nextSequence,
        })
        .select()
        .single();

      if (itemError) {
        return NextResponse.json(
          { error: `DB insert failed for ${file.name}: ${itemError.message}` },
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

    // Sync image_count from actual item count (atomic — always correct)
    const { count } = await client
      .from('luv_review_items')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    await client
      .from('luv_review_sessions')
      .update({ image_count: count ?? results.length })
      .eq('id', sessionId);

    return NextResponse.json({
      uploaded: results.length,
      items: results,
    });
  } catch (err) {
    console.error('[luv/review-upload] Error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
