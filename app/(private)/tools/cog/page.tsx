import { createClient } from '@/lib/supabase-server';
import type { CogSeries } from '@/lib/types/cog';
import type { SeriesWithImage } from './types';
import { SeriesDashboard } from './series-dashboard';

export default async function CogPage() {
  const supabase = await createClient();
  const { data: seriesData } = await (supabase as any)
    .from('cog_series')
    .select('*')
    .is('parent_id', null)
    .order('updated_at', { ascending: false });

  const seriesList: CogSeries[] = Array.isArray(seriesData) ? seriesData : [];

  if (seriesList.length === 0) {
    return <SeriesDashboard series={[]} />;
  }

  const seriesIds = seriesList.map((series) => series.id);
  const { data: imageRows } = await (supabase as any)
    .from('cog_images')
    .select('id, series_id, storage_path, thumbnail_256, created_at')
    .in('series_id', seriesIds)
    .order('created_at', { ascending: false });

  const imagesBySeries = new Map<
    string,
    Array<{
      id: string;
      series_id: string;
      storage_path: string;
      thumbnail_256: string | null;
      created_at: string;
    }>
  >();

  for (const img of imageRows || []) {
    if (!img?.series_id) continue;
    if (!imagesBySeries.has(img.series_id)) {
      imagesBySeries.set(img.series_id, []);
    }
    imagesBySeries.get(img.series_id)!.push(img);
  }

  const seriesWithImages: SeriesWithImage[] = seriesList.map((series) => {
    const candidates = imagesBySeries.get(series.id) || [];
    const primary =
      candidates.find((img) => img.id === series.primary_image_id) ||
      candidates[0] ||
      null;

    return {
      ...series,
      imageCount: candidates.length,
      primaryImage: primary
        ? {
            id: primary.id,
            storage_path: primary.storage_path,
            thumbnail_256: primary.thumbnail_256,
          }
        : null,
    };
  });

  return <SeriesDashboard series={seriesWithImages} />;
}
