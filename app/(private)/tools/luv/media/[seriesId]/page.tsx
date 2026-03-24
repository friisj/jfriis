import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getSeriesByIdServer } from '@/lib/cog/server/series';
import { getEnabledTagsForSeriesServer } from '@/lib/cog/server/tags';
import { getSeriesImagesServer } from '@/lib/cog/server/images';
import { IconArrowLeft } from '@tabler/icons-react';
import { SeriesImageGrid } from './series-image-grid';

interface Props {
  params: Promise<{ seriesId: string }>;
}

export default async function LuvSeriesPage({ params }: Props) {
  const { seriesId } = await params;

  // Validate this series is linked to Luv via entity_links
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

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  const [images, enabledTags] = await Promise.all([
    getSeriesImagesServer(seriesId),
    getEnabledTagsForSeriesServer(seriesId),
  ]);

  const displayTitle = series.title.replace(/^Luv — /, '');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/tools/luv/media"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{displayTitle}</h1>
          <p className="text-xs text-muted-foreground">
            {images.length} {images.length === 1 ? 'image' : 'images'}
          </p>
        </div>
      </div>

      <SeriesImageGrid
        seriesId={seriesId}
        initialImages={images}
        seriesTitle={displayTitle}
        enabledTags={enabledTags}
      />
    </div>
  );
}
