import { getRemixJobFullServer, getSeriesByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RemixExecutionMonitor } from './remix-execution-monitor';

interface Props {
  params: Promise<{ id: string; jobId: string }>;
}

export default async function RemixMonitorPage({ params }: Props) {
  const { id: seriesId, jobId } = await params;

  let series, remixJob;
  try {
    [series, remixJob] = await Promise.all([
      getSeriesByIdServer(seriesId),
      getRemixJobFullServer(jobId),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/tools/cog" className="hover:text-foreground">
            Series
          </Link>
          <span>/</span>
          <Link href={`/tools/cog/${seriesId}`} className="hover:text-foreground">
            {series.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">Remix</span>
        </div>
        <h1 className="text-3xl font-bold">
          {remixJob.title || 'Remix Job'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {remixJob.iterations.length} iteration(s) • Status: {remixJob.status}
        </p>
      </div>

      <RemixExecutionMonitor
        initialJob={remixJob}
        seriesId={seriesId}
      />
    </div>
  );
}
