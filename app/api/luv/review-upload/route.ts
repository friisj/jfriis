import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/ai/auth';

const LUV_MEDIA_BUCKET = 'luv-images';
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

    // Get current item count for sequencing
    const { data: existing } = await client
      .from('luv_review_items')
      .select('id')
      .eq('session_id', sessionId);
    let nextSequence = existing?.length ?? 0;

    const results = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const storagePath = `reviews/${sessionId}/${nextSequence}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await client.storage
        .from(LUV_MEDIA_BUCKET)
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

      // Update session image count
      await client
        .from('luv_review_sessions')
        .update({ image_count: nextSequence + 1 })
        .eq('id', sessionId);

      results.push({
        id: item.id,
        sequence: item.sequence,
        storage_path: item.storage_path,
      });

      nextSequence++;
    }

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
