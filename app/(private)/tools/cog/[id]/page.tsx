import {
  getSeriesByIdServer,
  getGroupPrimaryImagesServer,
  getSeriesJobsServer,
  getChildSeriesServer,
  getEnabledTagsForSeriesServer,
  getGlobalTagsServer,
} from '@/lib/cog-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CogSeries, CogJob, CogTag, CogTagWithGroup, CogImageWithGroupInfo } from '@/lib/types/cog';
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
    // Core data (required)
    const [series, images, jobs, children] = await Promise.all([
      getSeriesByIdServer(id),
      getGroupPrimaryImagesServer(id),
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
    <div className="flex-1 border border-blue-500">
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
