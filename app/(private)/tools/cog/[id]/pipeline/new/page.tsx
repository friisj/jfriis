import { getSeriesWithImagesServer, getSeriesStyleGuidesServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PipelineBuilderForm } from './pipeline-builder-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewPipelinePage({ params }: Props) {
  const { id: seriesId } = await params;

  let seriesWithImages, styleGuides;
  try {
    [seriesWithImages, styleGuides] = await Promise.all([
      getSeriesWithImagesServer(seriesId),
      getSeriesStyleGuidesServer(seriesId),
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
            {seriesWithImages.title}
          </Link>
          <span>/</span>
          <span className="text-foreground">New Pipeline</span>
        </div>
        <h1 className="text-3xl font-bold">Create Pipeline Job</h1>
        <p className="text-muted-foreground mt-2">
          Build multi-step image generation workflows
        </p>
      </div>

      <PipelineBuilderForm
        seriesId={seriesId}
        images={seriesWithImages.images}
        styleGuides={styleGuides}
      />
    </div>
  );
}
