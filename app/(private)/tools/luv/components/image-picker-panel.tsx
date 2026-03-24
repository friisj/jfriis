'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCogImageUrl } from '@/lib/cog/images';
import { IconCheck } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { FileUIPart } from 'ai';
import type { CogSeries, CogImage } from '@/lib/types/cog';

interface ImagePickerPanelProps {
  onAttach: (files: FileUIPart[]) => void;
  onClose: () => void;
}

export function ImagePickerPanel({ onAttach, onClose }: ImagePickerPanelProps) {
  const [series, setSeries] = useState<CogSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [images, setImages] = useState<CogImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch Luv series on mount
  useEffect(() => {
    (async () => {
      // Fetch Luv series via entity_links
      const { data: links } = await (supabase as any)
        .from('entity_links')
        .select('target_id')
        .eq('source_type', 'luv')
        .eq('target_type', 'cog_series');

      const ids = (links ?? []).map((l: { target_id: string }) => l.target_id);
      if (ids.length === 0) { setLoading(false); return; }

      const { data } = await (supabase as any)
        .from('cog_series')
        .select('*')
        .in('id', ids)
        .order('title', { ascending: true });

      const list = (data ?? []) as CogSeries[];
      setSeries(list);
      if (list.length > 0) setSelectedSeriesId(list[0].id);
      setLoading(false);
    })();
  }, []);

  // Fetch images when series changes
  useEffect(() => {
    if (!selectedSeriesId) {
      setImages([]);
      return;
    }

    (async () => {
      const { data } = await (supabase as any)
        .from('cog_images')
        .select('*')
        .eq('series_id', selectedSeriesId)
        .order('created_at', { ascending: false });

      setImages((data ?? []) as CogImage[]);
    })();
  }, [selectedSeriesId]);

  const toggleImage = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAttach = useCallback(() => {
    const files: FileUIPart[] = images
      .filter((img) => selectedIds.has(img.id))
      .map((img) => ({
        type: 'file' as const,
        url: getCogImageUrl(img.storage_path),
        mediaType: (img.mime_type || 'image/png') as `${string}/${string}`,
        filename: img.filename,
      }));

    onAttach(files);
    onClose();
  }, [images, selectedIds, onAttach, onClose]);

  const displayTitle = (s: CogSeries) => s.title.replace(/^Luv — /, '');

  if (loading) {
    return <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">Loading...</div>;
  }

  if (series.length === 0) {
    return <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">No image series found</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Series tabs */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto shrink-0 border-b">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSelectedSeriesId(s.id);
              setSelectedIds(new Set());
            }}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors',
              s.id === selectedSeriesId
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            {displayTitle(s)}
          </button>
        ))}
      </div>

      {/* Image grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {images.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No images in this series</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img) => {
              const selected = selectedIds.has(img.id);
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => toggleImage(img.id)}
                  className={cn(
                    'relative aspect-square rounded-md overflow-hidden border-2 transition-colors',
                    selected ? 'border-foreground' : 'border-transparent hover:border-muted-foreground/50',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCogImageUrl(img.storage_path)}
                    alt={img.filename ?? ''}
                    className="w-full h-full object-cover"
                  />
                  {selected && (
                    <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                        <IconCheck size={14} className="text-background" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Attach bar */}
      {selectedIds.size > 0 && (
        <div className="shrink-0 border-t px-3 py-2">
          <button
            type="button"
            onClick={handleAttach}
            className="w-full py-2 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Attach {selectedIds.size} {selectedIds.size === 1 ? 'image' : 'images'}
          </button>
        </div>
      )}
    </div>
  );
}
