'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { IconEye, IconPencil, IconTrash } from '@tabler/icons-react';
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode';
import { getCogThumbnailUrl, updateSeries, deleteSeriesWithCleanup } from '@/lib/cog';
import type { SeriesWithImage } from './types';
import { PromptLibrary } from './config-library';

interface SeriesDashboardProps {
  series: SeriesWithImage[];
}

export function SeriesDashboard({ series: initialSeries }: SeriesDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'series';
  const { isPrivacyMode } = usePrivacyMode();

  const [series, setSeries] = useState(initialSeries);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const visibleSeries = filterPrivateRecords(series, isPrivacyMode);

  // Focus input when rename starts
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleStartRename = useCallback((s: SeriesWithImage) => {
    setRenamingId(s.id);
    setRenameValue(s.title);
  }, []);

  const handleFinishRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }

    const original = series.find((s) => s.id === renamingId);
    if (original && renameValue.trim() !== original.title) {
      try {
        await updateSeries(renamingId, { title: renameValue.trim() });
        setSeries((prev) =>
          prev.map((s) => (s.id === renamingId ? { ...s, title: renameValue.trim() } : s))
        );
      } catch (err) {
        console.error('Rename failed:', err);
      }
    }
    setRenamingId(null);
  }, [renamingId, renameValue, series]);

  const handleDelete = useCallback(async (s: SeriesWithImage) => {
    if (!confirm(`Delete "${s.title}" and all ${s.imageCount} images?`)) return;
    try {
      await deleteSeriesWithCleanup(s.id);
      setSeries((prev) => prev.filter((x) => x.id !== s.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

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
              {visibleSeries.map((s) => (
                <ContextMenu key={s.id}>
                  <ContextMenuTrigger asChild>
                    <div>
                      <Link href={`/tools/cog/${s.id}`} className="block">
                        <Card className="overflow-hidden transition hover:bg-accent">
                          <div className="relative aspect-[4/3] bg-muted">
                            {s.primaryImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getCogThumbnailUrl(
                                  s.primaryImage.storage_path,
                                  s.primaryImage.thumbnail_256,
                                )}
                                alt={s.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-muted-foreground/50">
                                No image
                              </div>
                            )}
                          </div>
                          <CardContent className="px-4 py-3">
                            {renamingId === s.id ? (
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={handleFinishRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleFinishRename();
                                  if (e.key === 'Escape') setRenamingId(null);
                                }}
                                onClick={(e) => e.preventDefault()}
                                className="font-semibold bg-transparent border-b border-foreground outline-none w-full"
                              />
                            ) : (
                              <h2 className="font-semibold">{s.title}</h2>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{s.imageCount} images</span>
                              {s.tags.length > 0 && (
                                <>
                                  <span>·</span>
                                  <span>{s.tags.length} tags</span>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuItem
                      className="text-xs"
                      onClick={() => router.push(`/tools/cog/${s.id}`)}
                    >
                      <IconEye size={14} className="mr-2" />
                      View
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-xs"
                      onClick={() => handleStartRename(s)}
                    >
                      <IconPencil size={14} className="mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      className="text-xs text-destructive focus:text-destructive"
                      onClick={() => handleDelete(s)}
                    >
                      <IconTrash size={14} className="mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
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
