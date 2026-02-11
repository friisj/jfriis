import { getPipelineJobWithStepsServer, getSeriesByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PipelineExecutionMonitor } from './pipeline-execution-monitor';

interface Props {
  params: Promise<{ id: string; jobId: string }>;
}

export default async function PipelineMonitorPage({ params }: Props) {
  const { id: seriesId, jobId } = await params;

  let series, pipelineJob;
  try {
    [series, pipelineJob] = await Promise.all([
      getSeriesByIdServer(seriesId),
      getPipelineJobWithStepsServer(jobId),
    ]);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8 max-w-5xl">
      {/* Header */}
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
          <span className="text-foreground">Pipeline Monitor</span>
        </div>
        <h1 className="text-3xl font-bold">
          {pipelineJob.title || 'Pipeline Job'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {pipelineJob.steps.length} step(s) • Status: {pipelineJob.status}
        </p>
      </div>

      <PipelineExecutionMonitor
        job={pipelineJob}
        seriesId={seriesId}
      />
    </div>
  );
}
