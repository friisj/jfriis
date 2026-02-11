import {
  getSeriesByIdServer,
  getGroupPrimaryImagesServer,
  getSeriesJobsServer,
  getChildSeriesServer,
  getEnabledTagsForSeriesServer,
  getGlobalTagsServer,
  getSeriesPhotographerConfigsServer,
  getSeriesDirectorConfigsServer,
  getSeriesProductionConfigsServer,
} from '@/lib/cog-server';
import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type {
  CogSeries,
  CogJob,
  CogTag,
  CogTagWithGroup,
  CogImageWithGroupInfo,
  CogPhotographerConfig,
  CogDirectorConfig,
  CogProductionConfig,
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
  photographerConfigs: CogPhotographerConfig[];
  directorConfigs: CogDirectorConfig[];
  productionConfigs: CogProductionConfig[];
} | null> {
  try {
    // Fetch series first to get primary_image_id
    const series = await getSeriesByIdServer(id);

    // Then fetch remaining data in parallel, using primary_image_id for group covers
    const [images, jobs, children, photographerConfigs, directorConfigs, productionConfigs] = await Promise.all([
      getGroupPrimaryImagesServer(id, series.primary_image_id),
      getSeriesJobsServer(id),
      getChildSeriesServer(id),
      getSeriesPhotographerConfigsServer(id),
      getSeriesDirectorConfigsServer(id),
      getSeriesProductionConfigsServer(id),
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
      photographerConfigs,
      directorConfigs,
      productionConfigs,
    };
  } catch {
    return null;
  }
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [data, { data: { user } }] = await Promise.all([
    getSeriesData(id),
    supabase.auth.getUser(),
  ]);

  if (!data || !user) {
    notFound();
  }

  const { series, images, jobs, children, enabledTags, globalTags, photographerConfigs, directorConfigs, productionConfigs } = data;

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
        photographerConfigs={photographerConfigs}
        directorConfigs={directorConfigs}
        productionConfigs={productionConfigs}
        userId={user.id}
      />
    </div>
  );
}
