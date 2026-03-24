import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSeriesByIdServer } from '@/lib/cog/server/series';
import { getSeriesImagesServer } from '@/lib/cog/server/images';
import { getCogImageUrl } from '@/lib/cog/images';
import { IconArrowLeft } from '@tabler/icons-react';
import { SeriesImageGrid } from './series-image-grid';

interface Props {
  params: Promise<{ seriesId: string }>;
}

export default async function LuvSeriesPage({ params }: Props) {
  const { seriesId } = await params;

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  // Validate this is a Luv series
  if (!series.tags?.includes('luv')) {
    notFound();
  }

  const images = await getSeriesImagesServer(seriesId);
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
      />
    </div>
  );
}
