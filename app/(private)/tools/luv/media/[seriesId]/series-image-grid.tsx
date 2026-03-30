'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { deleteImageWithCleanup } from '@/lib/cog/images';
import { getImageTagsBatch, addTagToImage } from '@/lib/cog/tags';
import { supabase } from '@/lib/supabase';
import { createImage } from '@/lib/cog/images';
import { TagToolbar } from '@/components/cog/tag-toolbar';
import { ImageGrid } from '@/components/cog/image-grid';
import type { CogImage, CogTagWithGroup } from '@/lib/types/cog';

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

  // Tag filter state
  const fixedTagSet = useMemo(() => new Set(fixedTags), [fixedTags]);
  const [activeTagFilter, setActiveTagFilter] = useState<Set<string>>(
    () => new Set(defaultTags)
  );
  const [imageTagsMap, setImageTagsMap] = useState<Map<string, Set<string>>>(new Map());
  const [tagsLoaded, setTagsLoaded] = useState(false);

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
      <TagToolbar
        enabledTags={enabledTags}
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
        onUpload={handleUpload}
        uploading={uploading}
      />

      <ImageGrid
        images={filteredImages}
        features={{ contextMenu: true, deleteButton: true, clipboard: true, move: true, copy: true, tag: true, setCover: true, delete: true }}
        seriesId={seriesId}
        enabledTags={enabledTags}
        imageTagIds={imageTagsMap}
        onDelete={handleDelete}
        onImageDeleted={(id) => setImages((prev) => prev.filter((img) => img.id !== id))}
        onImageMoved={(id) => setImages((prev) => prev.filter((img) => img.id !== id))}
        linkTo={(img) => `/tools/luv/media/${seriesId}/${img.id}`}
        emptyMessage={activeTagFilter.size > 0 ? 'No images match the selected tags.' : 'No images in this series yet.'}
      />
    </div>
  );
}
