import { getPipelineJobWithStepsServer, getSeriesByIdServer, getBaseCandidatesForJobServer, getImageByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PipelineExecutionMonitor } from './pipeline-execution-monitor';
import type { BaseCandidateWithImage } from './pipeline-execution-monitor';

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

  // Enrich step outputs with storage_path for image display
  const enrichedSteps = await Promise.all(
    pipelineJob.steps.map(async (step) => {
      if (!step.output?.image_id) return step;
      try {
        const image = await getImageByIdServer(step.output.image_id);
        return {
          ...step,
          output: { ...step.output, storage_path: image.storage_path },
        };
      } catch {
        return step;
      }
    })
  );
  pipelineJob.steps = enrichedSteps;

  // Fetch base candidates with their images if foundation is completed
  let baseCandidatesWithImages: BaseCandidateWithImage[] = [];
  if (pipelineJob.foundation_status === 'completed') {
    try {
      const rawCandidates = await getBaseCandidatesForJobServer(jobId);
      // Enrich candidates with image storage_path for display
      const enriched = await Promise.all(
        rawCandidates.map(async (candidate) => {
          try {
            const image = await getImageByIdServer(candidate.image_id);
            return {
              ...candidate,
              storage_path: image.storage_path,
            };
          } catch {
            return {
              ...candidate,
              storage_path: null,
            };
          }
        })
      );
      baseCandidatesWithImages = enriched;
    } catch {
      // Non-critical: candidates may not exist yet
    }
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
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
        initialBaseCandidates={baseCandidatesWithImages}
      />
    </div>
  );
}
