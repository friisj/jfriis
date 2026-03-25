'use client';

import { useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getCogImageUrl, getCogThumbnailUrl } from '@/lib/cog/images';
import { deleteImageWithCleanup } from '@/lib/cog/images';
import { getImageTagsBatch, addTagToImage } from '@/lib/cog/tags';
import { supabase } from '@/lib/supabase';
import { createImage } from '@/lib/cog/images';
import { IconFilter, IconPlus, IconX } from '@tabler/icons-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { TagFilterBar } from '@/components/cog/tag-filter-bar';
import type { CogImage, CogTagWithGroup } from '@/lib/types/cog';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SeriesImageGridProps {
  seriesId: string;
  initialImages: CogImage[];
  seriesTitle: string;
  enabledTags?: CogTagWithGroup[];
  /** Tags that are always active and can't be toggled off (e.g., module tag in chassis context) */
  fixedTags?: string[];
  /** Tags pre-selected in the pill bar (user can toggle off) */
  defaultTags?: string[];
}

export function SeriesImageGrid({
  seriesId,
  initialImages,
  seriesTitle,
  enabledTags = [],
  fixedTags = [],
  defaultTags = [],
}: SeriesImageGridProps) {
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tag filter state
  const fixedTagSet = useMemo(() => new Set(fixedTags), [fixedTags]);
  const [activeTagFilter, setActiveTagFilter] = useState<Set<string>>(
    () => new Set(defaultTags)
  );
  const [imageTagsMap, setImageTagsMap] = useState<Map<string, Set<string>>>(new Map());
  const [tagsLoaded, setTagsLoaded] = useState(false);
  // Which tags are visible in the pill bar (subset of enabledTags)
  const [visibleTagIds, setVisibleTagIds] = useState<Set<string>>(
    () => new Set([...fixedTags, ...defaultTags])
  );
  // Sync visibleTagIds when fixedTags/defaultTags props change
  useEffect(() => {
    setVisibleTagIds((prev) => {
      const next = new Set(prev);
      for (const id of fixedTags) next.add(id);
      for (const id of defaultTags) next.add(id);
      return next;
    });
  }, [fixedTags, defaultTags]);
  const visibleTags = useMemo(
    () => enabledTags.filter((t) => visibleTagIds.has(t.id)),
    [enabledTags, visibleTagIds],
  );

  // Load image tags
  useEffect(() => {
    if (!enabledTags.length || !images.length) {
      setTagsLoaded(true);
      return;
    }
    setTagsLoaded(false);
    (async () => {
      try {
        const tags = await getImageTagsBatch(images.map((img) => img.id));
        const map = new Map<string, Set<string>>();
        for (const [imageId, tagList] of tags) {
          map.set(imageId, new Set(tagList.map((t) => t.id)));
        }
        setImageTagsMap(map);
      } catch (err) {
        console.error('[series-image-grid] Tag load failed:', err);
      } finally {
        setTagsLoaded(true);
      }
    })();
  }, [enabledTags.length, images]);

  const filteredImages = useMemo(() => {
    const hasFixed = fixedTagSet.size > 0;
    const hasActive = activeTagFilter.size > 0;

    // No filtering needed
    if (!hasFixed && !hasActive) return images;
    // Don't filter until tags are loaded — show all while loading
    if (!tagsLoaded) return images;

    return images.filter((img) => {
      const imgTags = imageTagsMap.get(img.id);
      if (!imgTags) return !hasFixed; // if no tag data, only show if no fixed filter

      // Must match ALL fixed tags
      if (hasFixed) {
        for (const tagId of fixedTagSet) {
          if (!imgTags.has(tagId)) return false;
        }
      }

      // If active tags set, must match at least ONE
      if (hasActive) {
        let matchesAny = false;
        for (const tagId of activeTagFilter) {
          if (imgTags.has(tagId)) { matchesAny = true; break; }
        }
        return matchesAny;
      }

      return true;
    });
  }, [images, fixedTagSet, activeTagFilter, imageTagsMap, tagsLoaded]);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);

    for (const file of imageFiles) {
      try {
        const ext = file.name.split('.').pop() || 'jpg';
        const storagePath = `luv/media/${seriesId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('cog-images')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const image = await createImage({
          series_id: seriesId,
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type,
          source: 'upload',
          metadata: {},
        });

        // Auto-tag with fixed tags
        for (const tagId of fixedTags) {
          await addTagToImage(image.id, tagId).catch(() => {});
        }

        setImages((prev) => [image, ...prev]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setUploading(false);
  }, [seriesId, fixedTags]);

  const handleDelete = async (image: CogImage) => {
    if (!confirm('Delete this image?')) return;
    try {
      await deleteImageWithCleanup(image.id);
      setImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: add + filter + pill bar */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          title={uploading ? 'Uploading...' : 'Add image'}
        >
          <IconPlus size={14} />
        </button>

        {enabledTags.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 flex items-center justify-center size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Manage visible tags"
              >
                <IconFilter size={14} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-medium text-muted-foreground px-1 mb-1.5">Show in filter bar</p>
              {enabledTags.map((tag) => {
                const isFixed = fixedTagSet.has(tag.id);
                const isVisible = visibleTagIds.has(tag.id);
                const color = tag.color || tag.group?.color || '#888';
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={isFixed}
                    onClick={() => {
                      setVisibleTagIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(tag.id)) {
                          next.delete(tag.id);
                          setActiveTagFilter((a) => { const n = new Set(a); n.delete(tag.id); return n; });
                        } else {
                          next.add(tag.id);
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      'flex items-center gap-2 w-full px-1.5 py-1 rounded text-xs transition-colors',
                      isFixed ? 'opacity-50 cursor-default' : 'hover:bg-accent cursor-pointer',
                    )}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="flex-1 text-left truncate">{tag.name}</span>
                    {(isVisible || isFixed) && <span className="text-[10px] text-muted-foreground">visible</span>}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}

        <TagFilterBar
          enabledTags={visibleTags}
          activeTags={activeTagFilter}
          fixedTags={fixedTagSet.size > 0 ? fixedTagSet : undefined}
          onToggle={(tagId) => {
            setActiveTagFilter((prev) => {
              const next = new Set(prev);
              if (next.has(tagId)) next.delete(tagId);
              else next.add(tagId);
              return next;
            });
          }}
          onClear={() => setActiveTagFilter(new Set())}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleUpload(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Image grid */}
      {filteredImages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {activeTagFilter.size > 0 ? 'No images match the selected tags.' : 'No images in this series yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredImages.map((image) => (
            <div key={image.id} className="group relative">
              <Link href={`/tools/luv/media/${seriesId}/${image.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCogThumbnailUrl(image.storage_path, image.thumbnail_256)}
                  alt={image.filename ?? ''}
                  loading="lazy"
                  className="w-full aspect-square object-cover rounded-md"
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(image)}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconX size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
