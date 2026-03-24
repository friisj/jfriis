import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getCogThumbnailUrl } from '@/lib/cog/images';
import type { CogSeries } from '@/lib/types/cog';

interface LuvSeriesCard {
  id: string;
  title: string;
  description: string | null;
  imageCount: number;
  primaryImage: { storage_path: string; thumbnail_256: string | null } | null;
}

export default async function LuvMediaPage() {
  const supabase = await createClient();

  // Fetch all Luv-tagged series
  const { data: seriesData, error: seriesError } = await (supabase as any)
    .from('cog_series')
    .select('*')
    .contains('tags', ['luv'])
    .order('title', { ascending: true });

  if (seriesError) {
    console.error('[LuvMediaPage] Failed to fetch series:', seriesError);
  }

  const seriesList: CogSeries[] = (seriesData ?? []).map((row: CogSeries) => ({
    ...row,
    tags: row.tags ?? [],
  }));

  // Fetch image counts and primary images
  let cards: LuvSeriesCard[] = [];

  if (seriesList.length > 0) {
    const seriesIds = seriesList.map((s) => s.id);
    const { data: imageRows } = await (supabase as any)
      .from('cog_images')
      .select('id, series_id, storage_path, thumbnail_256')
      .in('series_id', seriesIds)
      .order('created_at', { ascending: false });

    const imagesBySeries = new Map<string, typeof imageRows>();
    for (const img of imageRows ?? []) {
      if (!imagesBySeries.has(img.series_id)) {
        imagesBySeries.set(img.series_id, []);
      }
      imagesBySeries.get(img.series_id)!.push(img);
    }

    cards = seriesList.map((series) => {
      const images = imagesBySeries.get(series.id) ?? [];
      const primary =
        images.find((img: { id: string }) => img.id === series.primary_image_id) ??
        images[0] ??
        null;

      return {
        id: series.id,
        title: series.title.replace(/^Luv — /, ''),
        description: series.description,
        imageCount: images.length,
        primaryImage: primary
          ? { storage_path: primary.storage_path, thumbnail_256: primary.thumbnail_256 }
          : null,
      };
    });
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-lg font-semibold">Media</h1>

      {cards.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No image series yet. Upload images through chassis modules or chat to get started.
        </p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((series) => (
            <Link
              key={series.id}
              href={`/tools/luv/media/${series.id}`}
              className="group rounded-lg border bg-card overflow-hidden hover:bg-accent transition-colors"
            >
              <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                {series.primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getCogThumbnailUrl(
                      series.primaryImage.storage_path,
                      series.primaryImage.thumbnail_256,
                    )}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No images</span>
                )}
              </div>
              <div className="p-3">
                <h2 className="text-sm font-medium">{series.title}</h2>
                <p className="text-xs text-muted-foreground">
                  {series.imageCount} {series.imageCount === 1 ? 'image' : 'images'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
