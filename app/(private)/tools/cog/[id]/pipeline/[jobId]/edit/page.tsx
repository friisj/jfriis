import {
  getJobByIdServer,
  getSeriesWithImagesServer,
  getAllPhotographerConfigsServer,
  getAllDirectorConfigsServer,
  getAllProductionConfigsServer,
} from '@/lib/cog-server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { PipelineBuilderForm } from '../../new/pipeline-builder-form';

interface Props {
  params: Promise<{ id: string; jobId: string }>;
}

export default async function EditPipelinePage({ params }: Props) {
  const { id: seriesId, jobId } = await params;

  let seriesWithImages, photographerConfigs, directorConfigs, productionConfigs, job;
  try {
    [seriesWithImages, photographerConfigs, directorConfigs, productionConfigs, job] = await Promise.all([
      getSeriesWithImagesServer(seriesId),
      getAllPhotographerConfigsServer(),
      getAllDirectorConfigsServer(),
      getAllProductionConfigsServer(),
      getJobByIdServer(jobId),
    ]);
  } catch {
    notFound();
  }

  // Only draft jobs can be edited
  if (job.status !== 'draft') {
    redirect(`/tools/cog/${seriesId}/pipeline/${jobId}`);
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configure Pipeline Job</h1>
      </div>

      <PipelineBuilderForm
        seriesId={seriesId}
        images={seriesWithImages.images}
        photographerConfigs={photographerConfigs}
        directorConfigs={directorConfigs}
        productionConfigs={productionConfigs}
        existingJob={job}
      />
    </div>
  );
}
