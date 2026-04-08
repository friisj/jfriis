'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { IconEye, IconPencil, IconTrash, IconLink, IconLinkOff } from '@tabler/icons-react';
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode';
import { getCogThumbnailUrl, updateSeries, deleteSeriesWithCleanup } from '@/lib/cog';
import { supabase } from '@/lib/supabase';
import type { SeriesWithImage } from './types';
import { toolsRegistry } from '../registry';

interface SeriesDashboardProps {
  series: SeriesWithImage[];
}

export function SeriesDashboard({ series: initialSeries }: SeriesDashboardProps) {
  const router = useRouter();
  const { isPrivacyMode } = usePrivacyMode();

  const [series, setSeries] = useState(initialSeries);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const visibleSeries = filterPrivateRecords(series, isPrivacyMode);

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

  const handleLinkTool = useCallback(async (seriesId: string, tool: string) => {
    try {
      const slug = series.find((s) => s.id === seriesId)?.title
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ?? seriesId;
      await (supabase as any)
        .from('entity_links')
        .insert({
          source_type: tool,
          source_id: slug,
          target_type: 'cog_series',
          target_id: seriesId,
          link_type: 'owns',
        })
        .select()
        .maybeSingle();
      setSeries((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? { ...s, toolLinks: [...(s.toolLinks ?? []), { sourceType: tool, sourceId: slug }] }
            : s
        )
      );
    } catch (err) {
      console.error('Link failed:', err);
    }
  }, [series]);

  const handleUnlinkTool = useCallback(async (seriesId: string, tool: string) => {
    try {
      const link = series
        .find((s) => s.id === seriesId)
        ?.toolLinks?.find((l) => l.sourceType === tool);
      if (!link) return;
      await (supabase as any)
        .from('entity_links')
        .delete()
        .eq('source_type', tool)
        .eq('source_id', link.sourceId)
        .eq('target_type', 'cog_series')
        .eq('target_id', seriesId);
      setSeries((prev) =>
        prev.map((s) =>
          s.id === seriesId
            ? { ...s, toolLinks: (s.toolLinks ?? []).filter((l) => l.sourceType !== tool) }
            : s
        )
      );
    } catch (err) {
      console.error('Unlink failed:', err);
    }
  }, [series]);

  if (visibleSeries.length === 0) {
    return (
      <div className="p-4">
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
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-4 lg:grid-cols-4 divide-x divide-y divide-border">
      {visibleSeries.map((s) => (
        <ContextMenu key={s.id}>
          <ContextMenuTrigger asChild>
            <Link href={`/tools/cog/${s.id}`} className="block aspect-square relative">
              <div className="absolute inset-0 aspect-square bg-muted z-20">
                {s.primaryImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getCogThumbnailUrl(s.primaryImage.storage_path)}
                    alt={s.title}
                    className="h-full w-full object-cover absolute aspect-square"
                  />
                ) : (
                  <div className="absolute aspect-square">
                    No image
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex flex-col items-start z-30 text-xs font-mono p-2">
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
                  <span className="text-foreground bg-background p-1">{s.title}</span>
                )}
                <span className="text-foreground p-1 bg-background">{s.imageCount}</span>
              </div>
            </Link>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-44">
            <ContextMenuItem className="text-xs" onClick={() => router.push(`/tools/cog/${s.id}`)}>
              <IconEye size={14} stroke={1.5} /> View
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-xs" onClick={() => handleStartRename(s)}>
              <IconPencil size={14} stroke={1.5} /> Rename
            </ContextMenuItem>
            <ContextMenuSeparator />
            {(() => {
              const linkedTools = new Set((s.toolLinks ?? []).map((l) => l.sourceType));
              const unlinkedTools = toolsRegistry.filter((t) => t.id !== 'cog' && !linkedTools.has(t.id));
              return (
                <>
                  {(s.toolLinks ?? []).map((l) => (
                    <ContextMenuItem key={l.sourceType} className="text-xs" onClick={() => handleUnlinkTool(s.id, l.sourceType)}>
                      <IconLinkOff size={14} stroke={1.5} /> Unlink from {l.sourceType}
                    </ContextMenuItem>
                  ))}
                  {unlinkedTools.length > 0 && (
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="text-xs">
                        <IconLink size={14} stroke={1.5} /> Link to...
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-40">
                        {unlinkedTools.map((tool) => (
                          <ContextMenuItem key={tool.id} className="text-xs" onClick={() => handleLinkTool(s.id, tool.id)}>
                            {tool.title}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  )}
                </>
              );
            })()}
            <ContextMenuSeparator />
            <ContextMenuItem className="text-xs text-destructive focus:text-destructive" onClick={() => handleDelete(s)}>
              <IconTrash size={14} stroke={1.5} /> Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}
