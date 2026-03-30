'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem,
} from '@/components/ui/context-menu';
import {
  IconEye,
  IconCopy,
  IconId,
  IconDownload,
  IconArrowRight,
  IconCopyPlus,
  IconTag,
  IconTrash,
  IconPhoto,
} from '@tabler/icons-react';
import {
  getCogImageUrl,
  moveImageToSeries,
  copyImageToSeries,
  deleteImageWithCleanup,
  setSeriesPrimaryImage,
} from '@/lib/cog';
import { addTagToImage, removeTagFromImage } from '@/lib/cog/tags';
import { supabase } from '@/lib/supabase';
import type { CogImageWithGroupInfo, CogSeries, CogTagWithGroup } from '@/lib/types/cog';

interface ImageContextMenuProps {
  image: CogImageWithGroupInfo;
  seriesId: string;
  enabledTags?: CogTagWithGroup[];
  imageTagIds?: Set<string>;
  children: React.ReactNode;
  isPrimary?: boolean;
  /** Custom view/expand handler. If omitted, navigates to Cog editor. Pass null to hide the View option entirely. */
  onView?: ((imageId: string) => void) | null;
  onDeleted?: (imageId: string) => void;
  onMoved?: (imageId: string) => void;
  onTagsChanged?: (imageId: string) => void;
  onSetCover?: (imageId: string) => void;
}

export function ImageContextMenu({
  image,
  seriesId,
  enabledTags = [],
  imageTagIds = new Set(),
  isPrimary = false,
  children,
  onView,
  onDeleted,
  onMoved,
  onTagsChanged,
  onSetCover,
}: ImageContextMenuProps) {
  const router = useRouter();
  const [seriesList, setSeriesList] = useState<CogSeries[] | null>(null);
  const [loadingSeries, setLoadingSeries] = useState(false);

  // Lazy-load series only when submenu opens
  const fetchSeries = useCallback(async () => {
    if (seriesList !== null) return; // already loaded
    setLoadingSeries(true);
    const { data } = await (supabase as any)
      .from('cog_series')
      .select('id, title, tags')
      .order('title', { ascending: true });
    setSeriesList((data ?? []).filter((s: CogSeries) => s.id !== seriesId));
    setLoadingSeries(false);
  }, [seriesList, seriesId]);

  const handleView = () => {
    router.push(`/tools/cog/${seriesId}/editor/${image.id}`);
  };

  const handleCopyToClipboard = async () => {
    try {
      const url = getCogImageUrl(image.storage_path);
      const res = await fetch(url);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(image.id);
  };

  const handleDownload = () => {
    const url = getCogImageUrl(image.storage_path);
    const a = document.createElement('a');
    a.href = url;
    a.download = image.filename || `image-${image.id}`;
    a.click();
  };

  const handleMoveTo = async (targetSeriesId: string) => {
    try {
      await moveImageToSeries(image.id, targetSeriesId);
      onMoved?.(image.id);
    } catch (err) {
      console.error('Move failed:', err);
    }
  };

  const handleCopyTo = async (targetSeriesId: string) => {
    try {
      await copyImageToSeries(image.id, targetSeriesId);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleToggleTag = async (tagId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await removeTagFromImage(image.id, tagId);
      } else {
        await addTagToImage(image.id, tagId);
      }
      onTagsChanged?.(image.id);
    } catch (err) {
      console.error('Tag toggle failed:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteImageWithCleanup(image.id);
      onDeleted?.(image.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const otherSeries = seriesList ?? [];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {onView !== null && (
          <ContextMenuItem
            onClick={() => onView ? onView(image.id) : handleView()}
            className="text-xs"
          >
            <IconEye size={14} className="mr-2" />
            View
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onClick={async () => {
            try {
              await setSeriesPrimaryImage(seriesId, isPrimary ? null : image.id);
              onSetCover?.(isPrimary ? '' : image.id);
            } catch (err) {
              console.error('Set cover failed:', err);
            }
          }}
          className="text-xs"
        >
          <IconPhoto size={14} className="mr-2" />
          {isPrimary ? 'Remove as cover' : 'Set as cover'}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onClick={handleCopyToClipboard} className="text-xs">
          <IconCopy size={14} className="mr-2" />
          Copy to clipboard
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCopyId} className="text-xs">
          <IconId size={14} className="mr-2" />
          Copy image ID
        </ContextMenuItem>
        <ContextMenuItem onClick={handleDownload} className="text-xs">
          <IconDownload size={14} className="mr-2" />
          Download original
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-xs" onPointerEnter={fetchSeries}>
            <IconArrowRight size={14} className="mr-2" />
            Move to series
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
            {loadingSeries && (
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                Loading...
              </ContextMenuItem>
            )}
            {otherSeries.map((s) => (
              <ContextMenuItem
                key={s.id}
                className="text-xs"
                onClick={() => handleMoveTo(s.id)}
              >
                {s.title}
              </ContextMenuItem>
            ))}
            {!loadingSeries && otherSeries.length === 0 && (
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                No other series
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger className="text-xs" onPointerEnter={fetchSeries}>
            <IconCopyPlus size={14} className="mr-2" />
            Copy to series
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
            {loadingSeries && (
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                Loading...
              </ContextMenuItem>
            )}
            {otherSeries.map((s) => (
              <ContextMenuItem
                key={s.id}
                className="text-xs"
                onClick={() => handleCopyTo(s.id)}
              >
                {s.title}
              </ContextMenuItem>
            ))}
            {!loadingSeries && otherSeries.length === 0 && (
              <ContextMenuItem disabled className="text-xs text-muted-foreground">
                No other series
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {enabledTags.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-xs">
                <IconTag size={14} className="mr-2" />
                Tags
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-44 max-h-64 overflow-y-auto">
                {enabledTags.map((tag) => {
                  const isActive = imageTagIds.has(tag.id);
                  return (
                    <ContextMenuCheckboxItem
                      key={tag.id}
                      className="text-xs"
                      checked={isActive}
                      onCheckedChange={() => handleToggleTag(tag.id, isActive)}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5 shrink-0"
                        style={{ backgroundColor: tag.color || tag.group?.color || '#888' }}
                      />
                      {tag.name}
                    </ContextMenuCheckboxItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          onClick={handleDelete}
          className="text-xs text-destructive focus:text-destructive"
        >
          <IconTrash size={14} className="mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
