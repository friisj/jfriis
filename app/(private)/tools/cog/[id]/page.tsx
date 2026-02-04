import { getSeriesWithImagesServer, getSeriesJobsServer, getChildSeriesServer } from '@/lib/cog-server';
import { getCogImageUrl } from '@/lib/cog';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import type { CogSeriesWithImages, CogJob, CogSeries } from '@/lib/types/cog';

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
  const images = series.images;

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/tools/cog" className="hover:text-foreground">
              Series
            </Link>
            <span>/</span>
            <span>{series.title}</span>
          </div>
          <h1 className="text-3xl font-bold">{series.title}</h1>
          {series.description && (
            <p className="text-muted-foreground mt-2">{series.description}</p>
          )}
          {series.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {series.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2 py-0.5 bg-muted rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/tools/cog/${id}/edit`}>Edit</Link>
          </Button>
          <Button asChild>
            <Link href={`/tools/cog/${id}/job/new`}>New Job</Link>
          </Button>
        </div>
      </div>

      {/* Child Series */}
      {children.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Sub-Series</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/tools/cog/${child.id}`}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <h3 className="font-medium">{child.title}</h3>
                {child.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {child.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Jobs */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Jobs</h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/tools/cog/${id}/job/new`}>New Job</Link>
          </Button>
        </div>
        {jobs.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground">No jobs yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/tools/cog/${id}/job/${job.id}`}
                className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {job.title || 'Untitled Job'}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {job.base_prompt}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      job.status === 'completed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : job.status === 'running'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          : job.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-muted'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Images */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Images ({images.length})
          </h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/tools/cog/${id}/upload`}>Upload</Link>
          </Button>
        </div>
        {images.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground mb-4">
              No images yet. Upload images or run a job to generate them.
            </p>
            <Button variant="outline" asChild>
              <Link href={`/tools/cog/${id}/upload`}>Upload Images</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <Link
                key={image.id}
                href={`/tools/cog/${id}/image/${image.id}`}
                className="border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
              >
                <div className="aspect-square bg-muted relative">
                  <img
                    src={getCogImageUrl(image.storage_path)}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2 text-xs">
                  <p className="truncate">{image.filename}</p>
                  <p className="text-muted-foreground">
                    {image.source === 'generated' ? 'Generated' : 'Uploaded'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
