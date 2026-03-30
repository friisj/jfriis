'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { CogGridImage } from './cog-image';
import { ImageContextMenu } from '@/app/(private)/tools/cog/[id]/image-context-menu';
import { IconCheck, IconX } from '@tabler/icons-react';
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
// Props
// ────────────────────────────────────────────────────────────────

interface ImageGridProps {
  images: CogImage[];
  columns?: ColumnPreset;

  // ── Feature: selection (multi-select with checkmarks) ──
  select?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;

  // ── Feature: context menu (right-click operations) ──
  contextMenu?: boolean;
  seriesId?: string;
  enabledTags?: CogTagWithGroup[];
  imageTagIds?: Map<string, Set<string>>;
  primaryImageId?: string;
  /** Custom view handler for context menu. Pass null to hide View option. Omit for default (Cog editor). */
  onView?: ((imageId: string) => void) | null;
  onImageDeleted?: (id: string) => void;
  onImageMoved?: (id: string) => void;
  onTagsChanged?: (id: string) => void;
  onSetCover?: (id: string) => void;

  // ── Feature: simple delete (hover X button) ──
  deleteButton?: boolean;
  onDelete?: (image: CogImage) => void;

  // ── Feature: link (click navigates) ──
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
  select,
  selectedIds,
  onToggleSelect,
  contextMenu,
  seriesId,
  enabledTags,
  imageTagIds,
  primaryImageId,
  onView,
  onImageDeleted,
  onImageMoved,
  onTagsChanged,
  onSetCover,
  deleteButton,
  onDelete,
  linkTo,
  emptyMessage = 'No images',
}: ImageGridProps) {
  const handleClick = useCallback(
    (image: CogImage) => {
      if (select && onToggleSelect) {
        onToggleSelect(image.id);
      }
    },
    [select, onToggleSelect],
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
        const isSelected = select && selectedIds?.has(image.id);

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
            {select && isSelected && (
              <div className="absolute inset-0 bg-foreground/20 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center">
                  <IconCheck size={14} className="text-background" />
                </div>
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
        } else if (select) {
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
        if (contextMenu && seriesId) {
          wrapped = (
            <ImageContextMenu
              image={image as import('@/lib/types/cog').CogImageWithGroupInfo}
              seriesId={seriesId}
              enabledTags={enabledTags}
              imageTagIds={imageTagIds?.get(image.id)}
              isPrimary={primaryImageId === image.id}
              onView={onView !== undefined ? onView : (linkTo ? null : undefined)}
              onDeleted={onImageDeleted}
              onMoved={onImageMoved}
              onTagsChanged={onTagsChanged}
              onSetCover={onSetCover}
            >
              {wrapped}
            </ImageContextMenu>
          );
        }

        return (
          <div key={image.id} className="group relative">
            {wrapped}

            {/* Simple delete button (hover) */}
            {deleteButton && onDelete && (
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
