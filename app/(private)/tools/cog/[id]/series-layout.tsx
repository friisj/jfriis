'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGallery } from './image-gallery';
import { JobsList } from './jobs-list';
import type { CogSeriesWithImages, CogJob, CogSeries } from '@/lib/types/cog';

interface SeriesLayoutProps {
  series: CogSeriesWithImages;
  jobs: CogJob[];
  childSeries: CogSeries[];
  seriesId: string;
}

function ConfigPanel({ series, childSeries, seriesId }: { series: CogSeriesWithImages; childSeries: CogSeries[]; seriesId: string }) {
  return (
    <div className="space-y-6">
      {/* Series Info */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Series</h2>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/tools/cog/${seriesId}/edit`}>Edit</Link>
          </Button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Title</p>
            <p className="font-medium">{series.title}</p>
          </div>
          {series.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Description</p>
              <p className="text-sm">{series.description}</p>
            </div>
          )}
          {series.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {series.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-muted rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Child Series */}
      {childSeries.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Sub-Series</h3>
          <div className="space-y-2">
            {childSeries.map((child) => (
              <Link
                key={child.id}
                href={`/tools/cog/${child.id}`}
                className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm">{child.title}</p>
                {child.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {child.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobsPanel({ jobs, seriesId }: { jobs: CogJob[]; seriesId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Jobs ({jobs.length})</h2>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/tools/cog/${seriesId}/job/new`}>New Job</Link>
        </Button>
      </div>
      <JobsList jobs={jobs} seriesId={seriesId} />
    </div>
  );
}

function ImagesPanel({ images, seriesId }: { images: CogSeriesWithImages['images']; seriesId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Images ({images.length})</h2>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/tools/cog/${seriesId}/upload`}>Upload</Link>
        </Button>
      </div>
      {images.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/50">
          <p className="text-muted-foreground mb-4">
            No images yet. Upload images or run a job to generate them.
          </p>
          <Button variant="outline" asChild>
            <Link href={`/tools/cog/${seriesId}/upload`}>Upload Images</Link>
          </Button>
        </div>
      ) : (
        <ImageGallery images={images} seriesId={seriesId} />
      )}
    </div>
  );
}

export function SeriesLayout({ series, jobs, childSeries, seriesId }: SeriesLayoutProps) {
  const images = series.images;

  return (
    <>
      {/* Wide layout: 3 columns */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr_1fr] lg:gap-6 h-[calc(100vh-8rem)]">
        {/* Config column */}
        <div className="overflow-y-auto border-r pr-6">
          <ConfigPanel series={series} childSeries={childSeries} seriesId={seriesId} />
        </div>

        {/* Jobs column */}
        <div className="overflow-y-auto pr-3">
          <JobsPanel jobs={jobs} seriesId={seriesId} />
        </div>

        {/* Images column */}
        <div className="overflow-y-auto pl-3">
          <ImagesPanel images={images} seriesId={seriesId} />
        </div>
      </div>

      {/* Narrow layout: Tabs */}
      <div className="lg:hidden">
        <Tabs defaultValue="images" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="config">Config</TabsTrigger>
            <TabsTrigger value="jobs">Jobs ({jobs.length})</TabsTrigger>
            <TabsTrigger value="images">Images ({images.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="mt-4">
            <ConfigPanel series={series} childSeries={childSeries} seriesId={seriesId} />
          </TabsContent>
          <TabsContent value="jobs" className="mt-4">
            <JobsPanel jobs={jobs} seriesId={seriesId} />
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            <ImagesPanel images={images} seriesId={seriesId} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
