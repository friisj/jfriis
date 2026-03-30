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
  IconStar,
  IconStarFilled,
} from '@tabler/icons-react';
import {
  getCogImageUrl,
  moveImageToSeries,
  copyImageToSeries,
  deleteImageWithCleanup,
  setSeriesPrimaryImage,
  setImageStarRating,
} from '@/lib/cog';
import { addTagToImage, removeTagFromImage } from '@/lib/cog/tags';
import { supabase } from '@/lib/supabase';
import type { CogImageWithGroupInfo, CogSeries, CogTagWithGroup } from '@/lib/types/cog';

export interface ContextMenuFeatures {
  /** View/expand option. true = default Cog editor, function = custom, falsy = hidden */
  view?: boolean | ((imageId: string) => void);
  /** Move to series submenu */
  move?: boolean;
  /** Copy to series submenu */
  copy?: boolean;
  /** Tag management submenu */
  tag?: boolean;
  /** Copy to clipboard, Copy ID, Download */
  clipboard?: boolean;
  /** Star rating submenu (1-5 stars) */
  star?: boolean;
  /** Set/remove as series cover */
  setCover?: boolean;
  /** Delete option */
  delete?: boolean;
}

interface ImageContextMenuProps {
  image: CogImageWithGroupInfo;
  seriesId: string;
  enabledTags?: CogTagWithGroup[];
  imageTagIds?: Set<string>;
  children: React.ReactNode;
  isPrimary?: boolean;
  /** Granular control of which menu items appear. Omit for all enabled. */
  features?: ContextMenuFeatures;
  /** @deprecated Use features.view instead */
  onView?: ((imageId: string) => void) | null;
  onDeleted?: (imageId: string) => void;
  onMoved?: (imageId: string) => void;
  onTagsChanged?: (imageId: string) => void;
  onSetCover?: (imageId: string) => void;
  onStarChanged?: (imageId: string, rating: number) => void;
}

/** Default: all features enabled */
const DEFAULT_FEATURES: ContextMenuFeatures = {
  view: true,
  move: true,
  copy: true,
  tag: true,
  star: true,
  clipboard: true,
  setCover: true,
  delete: true,
};

export function ImageContextMenu({
  image,
  seriesId,
  enabledTags = [],
  imageTagIds = new Set(),
  isPrimary = false,
  children,
  features: featuresProp,
  onView,
  onDeleted,
  onMoved,
  onTagsChanged,
  onSetCover,
  onStarChanged,
}: ImageContextMenuProps) {
  // Merge features — explicit features prop overrides defaults
  const f = featuresProp ?? DEFAULT_FEATURES;

  // Resolve view: onView prop (legacy) takes precedence, then features.view
  const showView = onView !== null && (onView !== undefined ? true : !!f.view);
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
        {showView && (
          <>
            <ContextMenuItem
              onClick={() => {
                if (onView) onView(image.id);
                else if (typeof f.view === 'function') f.view(image.id);
                else handleView();
              }}
              className="text-xs"
            >
              <IconEye size={14} stroke={1.5} />
              View
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {f.setCover && (
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
            <IconPhoto size={14} stroke={1.5} />
            {isPrimary ? 'Remove as cover' : 'Set as cover'}
          </ContextMenuItem>
        )}

        {f.clipboard && (
          <>
            <ContextMenuItem onClick={handleCopyToClipboard} className="text-xs">
              <IconCopy size={14} stroke={1.5} />
              Copy to clipboard
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopyId} className="text-xs">
              <IconId size={14} stroke={1.5} />
              Copy image ID
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDownload} className="text-xs">
              <IconDownload size={14} stroke={1.5} />
              Download original
            </ContextMenuItem>
          </>
        )}

        {(f.move || f.copy) && <ContextMenuSeparator />}

        {f.move && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs" onPointerEnter={fetchSeries}>
              <IconArrowRight size={14} stroke={1.5} />
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
        )}

        {f.copy && (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="text-xs" onPointerEnter={fetchSeries}>
              <IconCopyPlus size={14} stroke={1.5} />
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
        )}

        {f.tag && enabledTags.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-xs">
                <IconTag size={14} stroke={1.5} />
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

        {f.star && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="text-xs">
                {(image.star_rating ?? 0) > 0
                  ? <IconStarFilled size={14} className="text-yellow-400" />
                  : <IconStar size={14} stroke={1.5} />}
                {(image.star_rating ?? 0) > 0 ? `${image.star_rating} star${image.star_rating !== 1 ? 's' : ''}` : 'Rate'}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-36">
                {[1, 2, 3, 4, 5].map((stars) => (
                  <ContextMenuItem
                    key={stars}
                    className="text-xs"
                    onClick={async () => {
                      const newRating = stars === image.star_rating ? 0 : stars;
                      try {
                        await setImageStarRating(image.id, newRating);
                        onStarChanged?.(image.id, newRating);
                      } catch (err) {
                        console.error('Star rating failed:', err);
                      }
                    }}
                  >
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        i < stars
                          ? <IconStarFilled key={i} size={12} className="text-yellow-400" />
                          : <IconStar key={i} size={12} stroke={1.5} className="text-muted-foreground/40" />
                      ))}
                    </span>
                  </ContextMenuItem>
                ))}
                {(image.star_rating ?? 0) > 0 && (
                  <ContextMenuItem
                    className="text-xs text-muted-foreground"
                    onClick={async () => {
                      try {
                        await setImageStarRating(image.id, 0);
                        onStarChanged?.(image.id, 0);
                      } catch (err) {
                        console.error('Clear rating failed:', err);
                      }
                    }}
                  >
                    Clear rating
                  </ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {f.delete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={handleDelete}
              className="text-xs text-destructive focus:text-destructive"
            >
              <IconTrash size={14} stroke={1.5} />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
