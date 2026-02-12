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
    <div className="container py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/tools/cog" className="hover:text-foreground">
            Series
          </Link>
          <span>/</span>
          <Link href={`/tools/cog/${seriesId}`} className="hover:text-foreground">
            {seriesWithImages.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">Edit Pipeline</span>
        </div>
        <h1 className="text-3xl font-bold">Edit Pipeline Job</h1>
        <p className="text-muted-foreground mt-2">
          Modify pipeline configuration before running
        </p>
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
