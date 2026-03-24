import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getSeriesByIdServer } from '@/lib/cog/server/series';
import { getImageByIdServer, getSeriesImagesServer } from '@/lib/cog/server/images';
import { LuvImageViewer } from './image-viewer';

interface Props {
  params: Promise<{ seriesId: string; imageId: string }>;
}

export default async function LuvImageDetailPage({ params }: Props) {
  const { seriesId, imageId } = await params;

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  // Validate this is a Luv-linked series
  const supabase = await createClient();
  const { data: link } = await (supabase as any)
    .from('entity_links')
    .select('id')
    .eq('source_type', 'luv')
    .eq('target_type', 'cog_series')
    .eq('target_id', seriesId)
    .limit(1)
    .maybeSingle();
  if (!link) notFound();

  let image;
  try {
    image = await getImageByIdServer(imageId);
  } catch {
    notFound();
  }

  if (image.series_id !== seriesId) {
    notFound();
  }

  const allImages = await getSeriesImagesServer(seriesId);

  return (
    <LuvImageViewer
      seriesId={seriesId}
      imageId={imageId}
      images={allImages}
      seriesTitle={series.title.replace(/^Luv — /, '')}
    />
  );
}
