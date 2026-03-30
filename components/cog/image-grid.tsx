'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { CogGridImage } from './cog-image';
import { ImageContextMenu } from '@/app/(private)/tools/cog/[id]/image-context-menu';
import { IconCheck, IconX, IconStarFilled } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { CogImage, CogTagWithGroup } from '@/lib/types/cog';

// ────────────────────────────────────────────────────────────────
// Column presets
// ────────────────────────────────────────────────────────────────

export type ColumnPreset = 'compact' | 'default' | 'dense';

const COLUMN_CLASSES: Record<ColumnPreset, string> = {
  compact: 'grid-cols-3 gap-2',
  default: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3',
  dense: 'grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4',
};

// ────────────────────────────────────────────────────────────────
// Features — explicit opt-in for every capability
// ────────────────────────────────────────────────────────────────

export interface ImageGridFeatures {
  /** Multi-select with checkmark overlays */
  select?: boolean;
  /** Right-click context menu */
  contextMenu?: boolean;
  /** Hover delete button (X) */
  deleteButton?: boolean;
  /** Context menu: View/expand option. Handler or true for default (Cog editor). */
  view?: boolean | ((imageId: string) => void);
  /** Context menu: Move to series */
  move?: boolean;
  /** Context menu: Copy to series */
  copy?: boolean;
  /** Context menu: Tag management */
  tag?: boolean;
  /** Context menu: Copy to clipboard + Copy ID + Download */
  clipboard?: boolean;
  /** Context menu: Star rating */
  star?: boolean;
  /** Context menu: Set as series cover */
  setCover?: boolean;
  /** Context menu: Delete */
  delete?: boolean;
}

/** All context menu features enabled — use as base for Cog gallery */
export const ALL_FEATURES: ImageGridFeatures = {
  contextMenu: true,
  view: true,
  move: true,
  copy: true,
  tag: true,
  star: true,
  clipboard: true,
  setCover: true,
  delete: true,
  deleteButton: true,
};

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────

interface ImageGridProps {
  images: CogImage[];
  columns?: ColumnPreset;
  features?: ImageGridFeatures;

  // ── Selection state (when features.select) ──
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;

  // ── Context menu data ──
  seriesId?: string;
  enabledTags?: CogTagWithGroup[];
  imageTagIds?: Map<string, Set<string>>;
  primaryImageId?: string;

  // ── Callbacks ──
  onDelete?: (image: CogImage) => void;
  onImageDeleted?: (id: string) => void;
  onImageMoved?: (id: string) => void;
  onTagsChanged?: (id: string) => void;
  onSetCover?: (id: string) => void;
  onStarChanged?: (id: string, rating: number) => void;

  // ── Navigation ──
  linkTo?: (image: CogImage) => string;

  // ── Empty state ──
  emptyMessage?: string;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export function ImageGrid({
  images,
  columns = 'default',
  features = {},
  selectedIds,
  onToggleSelect,
  seriesId,
  enabledTags,
  imageTagIds,
  primaryImageId,
  onDelete,
  onImageDeleted,
  onImageMoved,
  onTagsChanged,
  onSetCover,
  onStarChanged,
  linkTo,
  emptyMessage = 'No images',
}: ImageGridProps) {
  const handleClick = useCallback(
    (image: CogImage) => {
      if (features.select && onToggleSelect) {
        onToggleSelect(image.id);
      }
    },
    [features.select, onToggleSelect],
  );

  if (images.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn('grid', COLUMN_CLASSES[columns])}>
      {images.map((image) => {
        const isSelected = features.select && selectedIds?.has(image.id);

        const imageElement = (
          <div className="relative aspect-square rounded-md overflow-hidden">
            <CogGridImage
              storagePath={image.storage_path}
              alt={image.filename ?? ''}
              thumbnail256={image.thumbnail_256}
              thumbnail128={image.thumbnail_128}
              fill
              className="object-cover"
            />

            {/* Selection overlay */}
            {features.select && isSelected && (
              <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                  <IconCheck size={14} className="text-background" />
                </div>
              </div>
            )}

            {/* Star rating overlay */}
            {features.star && (image.star_rating ?? 0) > 0 && (
              <div className="absolute bottom-1 left-1 flex items-center gap-px bg-black/50 rounded px-1 py-0.5">
                <IconStarFilled size={10} className="text-yellow-400" />
                <span className="text-[9px] text-white font-medium">{image.star_rating}</span>
              </div>
            )}
          </div>
        );

        // Wrap with appropriate interaction
        let wrapped: React.ReactNode;

        if (linkTo) {
          wrapped = (
            <Link href={linkTo(image)} className="block">
              {imageElement}
            </Link>
          );
        } else if (features.select) {
          wrapped = (
            <button
              type="button"
              onClick={() => handleClick(image)}
              className={cn(
                'w-full border-2 rounded-md transition-colors',
                isSelected ? 'border-foreground' : 'border-transparent hover:border-muted-foreground/50',
              )}
            >
              {imageElement}
            </button>
          );
        } else {
          wrapped = imageElement;
        }

        // Wrap with context menu if enabled
        if (features.contextMenu && seriesId) {
          // Derive onView for context menu:
          // - features.view is a function → custom handler
          // - features.view is true → default (Cog editor)
          // - features.view is falsy → hide View option
          const onView = typeof features.view === 'function'
            ? features.view
            : features.view
              ? undefined  // default behavior
              : null;      // hide

          wrapped = (
            <ImageContextMenu
              image={image as import('@/lib/types/cog').CogImageWithGroupInfo}
              seriesId={seriesId}
              enabledTags={features.tag ? enabledTags : undefined}
              imageTagIds={features.tag ? imageTagIds?.get(image.id) : undefined}
              isPrimary={primaryImageId === image.id}
              features={{
                view: features.view,
                move: features.move,
                copy: features.copy,
                tag: features.tag,
                star: features.star,
                clipboard: features.clipboard,
                setCover: features.setCover,
                delete: features.delete,
              }}
              onView={onView}
              onDeleted={onImageDeleted}
              onMoved={onImageMoved}
              onTagsChanged={onTagsChanged}
              onSetCover={onSetCover}
              onStarChanged={onStarChanged}
            >
              {wrapped}
            </ImageContextMenu>
          );
        }

        return (
          <div key={image.id} className="group relative">
            {wrapped}

            {/* Simple delete button (hover) */}
            {features.deleteButton && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(image);
                }}
                className="absolute top-1 right-1 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <IconX size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
