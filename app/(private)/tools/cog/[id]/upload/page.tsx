import { getSeriesByIdServer } from '@/lib/cog-server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { UploadForm } from './upload-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UploadPage({ params }: Props) {
  const { id: seriesId } = await params;

  let series;
  try {
    series = await getSeriesByIdServer(seriesId);
  } catch {
    notFound();
  }

  return (
    <div className="container py-8 max-w-2xl">
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
          <span>Upload</span>
        </div>
        <h1 className="text-3xl font-bold">Upload Images</h1>
        <p className="text-muted-foreground mt-2">
          Add reference images to this series
        </p>
      </div>

      <UploadForm seriesId={seriesId} seriesTitle={series.title} />
    </div>
  );
}
