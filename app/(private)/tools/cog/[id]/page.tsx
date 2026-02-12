import {
  getSeriesByIdServer,
  getGroupPrimaryImagesServer,
  getSeriesJobsServer,
  getChildSeriesServer,
  getEnabledTagsForSeriesServer,
  getGlobalTagsServer,
} from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import type {
  CogSeries,
  CogJob,
  CogTag,
  CogTagWithGroup,
  CogImageWithGroupInfo,
} from '@/lib/types/cog';
import { SeriesLayout } from './series-layout';

interface Props {
  params: Promise<{ id: string }>;
}

async function getSeriesData(id: string): Promise<{
  series: CogSeries;
  images: CogImageWithGroupInfo[];
  jobs: CogJob[];
  children: CogSeries[];
  enabledTags: CogTagWithGroup[];
  globalTags: CogTag[];
} | null> {
  try {
    // Fetch series first to get primary_image_id
    const series = await getSeriesByIdServer(id);

    // Then fetch remaining data in parallel, using primary_image_id for group covers
    const [images, jobs, children] = await Promise.all([
      getGroupPrimaryImagesServer(id, series.primary_image_id),
      getSeriesJobsServer(id),
      getChildSeriesServer(id),
    ]);

    // Tag data (optional - tables may not exist yet)
    let enabledTags: CogTagWithGroup[] = [];
    let globalTags: CogTag[] = [];
    try {
      [enabledTags, globalTags] = await Promise.all([
        getEnabledTagsForSeriesServer(id),
        getGlobalTagsServer(),
      ]);
    } catch (tagError) {
      // Tags tables may not exist yet - that's OK
      console.warn('Tags not available (tables may not exist yet):', tagError);
    }

    return {
      series,
      images,
      jobs,
      children,
      enabledTags,
      globalTags,
    };
  } catch {
    return null;
  }
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params;

  const data = await getSeriesData(id);

  if (!data) {
    notFound();
  }

  const { series, images, jobs, children, enabledTags, globalTags } = data;

  return (
    <div className="flex-1">
      <SeriesLayout
        series={series}
        images={images}
        jobs={jobs}
        childSeries={children}
        seriesId={id}
        enabledTags={enabledTags}
        globalTags={globalTags}
      />
    </div>
  );
}
