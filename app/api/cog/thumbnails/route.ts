import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/ai/auth';
import { generateThumbnails } from '@/lib/cog/thumbnails';
import { createClient } from '@/lib/supabase-server';

/**
 * POST /api/cog/thumbnails
 * Regenerate thumbnails for images in a series that are missing them.
 * Body: { seriesId: string }
 */
export async function POST(req: Request) {
  await requireAuth();

  const { seriesId } = await req.json();
  if (!seriesId) return NextResponse.json({ error: 'seriesId required' }, { status: 400 });

  const client = await createClient();

  // Find images in this series missing thumbnails
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: images, error } = await (client as any)
    .from('cog_images')
    .select('id, storage_path, mime_type')
    .eq('series_id', seriesId)
    .is('thumbnail_256', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!images?.length) return NextResponse.json({ generated: 0, message: 'All images have thumbnails' });

  // Filter out videos
  const imageFiles = images.filter((img: { mime_type: string }) =>
    !img.mime_type?.startsWith('video/')
  );

  let generated = 0;
  let failed = 0;

  for (const img of imageFiles) {
    const result = await generateThumbnails(img.id, img.storage_path);
    if (result) generated++;
    else failed++;
  }

  return NextResponse.json({ generated, failed, total: imageFiles.length });
}
