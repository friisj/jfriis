import { getSeriesWithImagesServer, getSeriesJobsServer, getChildSeriesServer } from '@/lib/cog-server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CogSeriesWithImages, CogJob, CogSeries } from '@/lib/types/cog';
import { SeriesLayout } from './series-layout';

interface Props {
  params: Promise<{ id: string }>;
}

async function getSeriesData(id: string): Promise<{
  series: CogSeriesWithImages;
  jobs: CogJob[];
  children: CogSeries[];
} | null> {
  try {
    const [seriesWithImages, jobs, children] = await Promise.all([
      getSeriesWithImagesServer(id),
      getSeriesJobsServer(id),
      getChildSeriesServer(id),
    ]);

    return {
      series: seriesWithImages,
      jobs,
      children,
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

  const { series, jobs, children } = data;

  return (
    <div className="px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/tools/cog" className="hover:text-foreground">
          Series
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{series.title}</span>
      </div>

      <SeriesLayout
        series={series}
        jobs={jobs}
        childSeries={children}
        seriesId={id}
      />
    </div>
  );
}
