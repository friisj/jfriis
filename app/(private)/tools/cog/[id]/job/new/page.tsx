import { getSeriesWithImagesServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { NewJobForm } from './new-job-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NewJobPage({ params }: Props) {
  const { id: seriesId } = await params;

  let seriesWithImages;
  try {
    seriesWithImages = await getSeriesWithImagesServer(seriesId);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8 max-w-4xl">
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
          <span>New Job</span>
        </div>
        <h1 className="text-3xl font-bold">New Job</h1>
        <p className="text-muted-foreground mt-2">
          Generate images based on this series
        </p>
      </div>

      <NewJobForm series={seriesWithImages} images={seriesWithImages.images} />
    </div>
  );
}
