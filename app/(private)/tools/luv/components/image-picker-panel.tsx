'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCogImageUrl, getCogThumbnailUrl } from '@/lib/cog/images';
import { IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { FileUIPart } from 'ai';
import type { CogSeries, CogImage } from '@/lib/types/cog';

interface ImagePickerPanelProps {
  onAttach: (files: FileUIPart[]) => void;
  onClose: () => void;
}

export function ImagePickerPanel({ onAttach, onClose }: ImagePickerPanelProps) {
  const [series, setSeries] = useState<CogSeries[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<CogSeries | null>(null);
  const [images, setImages] = useState<CogImage[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [imageCounts, setImageCounts] = useState<Map<string, number>>(new Map());

  // Fetch Luv series on mount
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('cog_series')
        .select('*')
        .contains('tags', ['luv'])
        .order('title', { ascending: true });

      const list = (data ?? []) as CogSeries[];
      setSeries(list);

      // Fetch image counts
      if (list.length > 0) {
        const ids = list.map((s) => s.id);
        const { data: imgs } = await (supabase as any)
          .from('cog_images')
          .select('series_id')
          .in('series_id', ids);

        const counts = new Map<string, number>();
        for (const row of imgs ?? []) {
          counts.set(row.series_id, (counts.get(row.series_id) ?? 0) + 1);
        }
        setImageCounts(counts);
      }

      setLoading(false);
    })();
  }, []);

  // Fetch images when series is selected
  useEffect(() => {
    if (!selectedSeries) {
      setImages([]);
      return;
    }

    (async () => {
      const { data } = await (supabase as any)
        .from('cog_images')
        .select('*')
        .eq('series_id', selectedSeries.id)
        .order('created_at', { ascending: false });

      setImages((data ?? []) as CogImage[]);
    })();
  }, [selectedSeries]);

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

  // State 1: Series list
  if (!selectedSeries) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {series.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSelectedSeries(s);
                setSelectedIds(new Set());
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors border-b border-border/50"
            >
              <div className="w-10 h-10 rounded bg-muted shrink-0 overflow-hidden">
                {s.primary_image_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getCogThumbnailUrl(s.primary_image_id, null)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{displayTitle(s)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {imageCounts.get(s.id) ?? 0} images
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // State 2: Image grid for selected series
  return (
    <div className="flex flex-col h-full">
      {/* Back header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <button
          type="button"
          onClick={() => {
            setSelectedSeries(null);
            setSelectedIds(new Set());
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={14} />
        </button>
        <span className="text-xs font-medium">{displayTitle(selectedSeries)}</span>
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
                    src={getCogThumbnailUrl(img.storage_path, img.thumbnail_256)}
                    alt={img.filename ?? ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
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
