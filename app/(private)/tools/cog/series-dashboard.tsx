'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode';
import { getCogThumbnailUrl } from '@/lib/cog';
import type { SeriesWithImage } from './types';
import { PromptLibrary } from './config-library';

interface SeriesDashboardProps {
  series: SeriesWithImage[];
}

export function SeriesDashboard({ series }: SeriesDashboardProps) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'series';
  const { isPrivacyMode } = usePrivacyMode();
  const visibleSeries = filterPrivateRecords(series, isPrivacyMode);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <Tabs defaultValue={defaultTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="series">Series</TabsTrigger>
            <TabsTrigger value="library">Prompt Library</TabsTrigger>
          </TabsList>
          <Button asChild>
            <Link href="/tools/cog/new">New Series</Link>
          </Button>
        </div>

        <TabsContent value="series" className="mt-6">
          {visibleSeries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <p className="mb-4 text-muted-foreground">
                  No series yet. Create your first series to get started.
                </p>
                <Button asChild variant="outline">
                  <Link href="/tools/cog/new">Create Series</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {visibleSeries.map((series) => (
                <Link key={series.id} href={`/tools/cog/${series.id}`} className="block">
                  <Card className="overflow-hidden transition hover:bg-accent">
                    <div className="relative aspect-[4/3] bg-muted">
                      {series.primaryImage ? (
                        <img
                          src={getCogThumbnailUrl(
                            series.primaryImage.storage_path,
                            series.primaryImage.thumbnail_256,
                            256,
                          )}
                          alt={series.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground/50">
                          No image
                        </div>
                      )}
                    </div>
                    <CardContent className="px-4 py-3">
                      <h2 className="font-semibold">{series.title}</h2>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{series.imageCount} images</span>
                        {series.tags.length > 0 && (
                          <>
                            <span>·</span>
                            <span>{series.tags.length} tags</span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-6">
          <PromptLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
