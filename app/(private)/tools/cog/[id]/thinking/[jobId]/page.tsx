import { getThinkingJobFullServer, getSeriesByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ThinkingExecutionMonitor } from './thinking-execution-monitor';

interface Props {
  params: Promise<{ id: string; jobId: string }>;
}

export default async function ThinkingMonitorPage({ params }: Props) {
  const { id: seriesId, jobId } = await params;

  let series, thinkingJob;
  try {
    [series, thinkingJob] = await Promise.all([
      getSeriesByIdServer(seriesId),
      getThinkingJobFullServer(jobId),
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
          <span className="text-foreground">Thinking</span>
        </div>
        <h1 className="text-3xl font-bold">
          {thinkingJob.title || 'Thinking Job'}
        </h1>
      </div>

      <ThinkingExecutionMonitor
        initialJob={thinkingJob}
        seriesId={seriesId}
      />
    </div>
  );
}
