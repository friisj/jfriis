'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCogImageUrl,
  deleteImageWithCleanup,
  getImageTagsBatch,
  mergeImagesIntoGroup,
  addTagToImage,
  removeTagFromImage,
  addImageToGroup,
} from '@/lib/cog';
import { Button } from '@/components/ui/button';
import { CogGridImage, CogTinyImage } from '@/components/cog/cog-image';
import { StarRating } from './star-rating';
import type { CogTagWithGroup, CogImageWithGroupInfo } from '@/lib/types/cog';
import { Trash2 } from 'lucide-react';

export interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
}

interface ImageGalleryProps {
  images: CogImageWithGroupInfo[];
  seriesId: string;
  primaryImageId?: string | null;
  enabledTags?: CogTagWithGroup[];
  onPrimaryImageChange?: (imageId: string | null) => void;
  uploadingFiles?: UploadingFile[];
  isDragOver?: boolean;
}

function BatchTagPanel({
  selectedCount,
  enabledTags,
  getTagState,
  onAddTag,
  onRemoveTag,
  onClose,
  isLoading,
}: {
  selectedCount: number;
  enabledTags: CogTagWithGroup[];
  getTagState: (tagId: string) => 'all' | 'some' | 'none';
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  const tagsByGroup = useMemo(() => {
    const groups = new Map<
      string | null,
      { name: string | null; color: string | null; tags: CogTagWithGroup[] }
    >();

    for (const tag of enabledTags) {
      const groupId = tag.group_id;
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          name: tag.group?.name || null,
          color: tag.group?.color || null,
          tags: [],
        });
      }
      groups.get(groupId)!.tags.push(tag);
    }

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return 0;
    });
  }, [enabledTags]);

  const handleTagClick = (tagId: string) => {
    const state = getTagState(tagId);
    if (state === 'all') {
      onRemoveTag(tagId);
    } else {
      onAddTag(tagId);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-30 w-[90vw] max-w-2xl -translate-x-1/2 rounded-lg border bg-background p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium">Batch Tag {selectedCount} Images</h3>
        </div>
        <button
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          Updating tags...
        </div>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {tagsByGroup.map(([groupId, group]) => (
            <div key={groupId || 'ungrouped'}>
              {group.name && (
                <p
                  className="mb-1.5 text-xs text-muted-foreground"
                  style={{ color: group.color ? `${group.color}80` : undefined }}
                >
                  {group.name}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {group.tags.map((tag) => {
                  const state = getTagState(tag.id);
                  const color = tag.color || group.color;
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm transition-colors ${
                        state === 'all'
                          ? 'bg-primary/15 text-primary border-primary/30'
                          : state === 'some'
                          ? 'bg-muted text-foreground border-border'
                          : 'text-muted-foreground border-border hover:border-foreground/40'
                      }`}
                      style={{
                        borderColor: state !== 'none' && color ? color : undefined,
                        backgroundColor:
                          state === 'all' && color ? `${color}30` : undefined,
                      }}
                    >
                      {tag.shortcut && (
                        <kbd className="text-[10px] font-mono text-muted-foreground">
                          {tag.shortcut}
                        </kbd>
                      )}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {enabledTags.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No tags enabled. Configure them from the series settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DeleteConfirmationModal({
  images,
  imageIds,
  primaryImageId,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  images: CogImageWithGroupInfo[];
  imageIds: string[];
  primaryImageId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const imagesToDelete = images.filter((img) => imageIds.includes(img.id));
  const count = imagesToDelete.length;
  const groupMembers = imagesToDelete.reduce(
    (sum, img) => sum + (img.group_count || 1),
    0,
  );
  const groupWarning = groupMembers > count;
  const primaryIncluded =
    Boolean(primaryImageId) && imageIds.includes(primaryImageId!);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-4 shadow-lg"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h2 className="text-lg font-semibold">
          Delete {count} image{count !== 1 ? 's' : ''}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This will permanently delete the selected images and any derived groups.
        </p>

        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {groupWarning && (
            <li className="flex items-center gap-2 text-amber-600">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              {groupMembers - count} additional image
              {groupMembers - count !== 1 ? 's' : ''} belong to these groups.
            </li>
          )}
          {primaryIncluded && (
            <li className="flex items-center gap-2 text-amber-600">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Series primary image will be cleared.
            </li>
          )}
        </ul>

        {count <= 6 && (
          <div className="flex gap-2">
            {imagesToDelete.slice(0, 4).map((img) => (
              <div
                key={img.id}
                className="relative h-12 w-12 overflow-hidden"
              >
                <CogTinyImage
                  storagePath={img.storage_path}
                  alt={img.filename}
                  thumbnail64={img.thumbnail_64}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ))}
            {count > 4 && (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                +{count - 4}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : `Delete ${count}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ImageGallery({
  images: initialImages,
  seriesId,
  primaryImageId: initialPrimaryImageId = null,
  enabledTags = [],
  onPrimaryImageChange,
  uploadingFiles = [],
  isDragOver = false,
}: ImageGalleryProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [imageTagsMap, setImageTagsMap] = useState<Map<string, Set<string>>>(
    new Map(),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showBatchTagPanel, setShowBatchTagPanel] = useState(false);
  const [batchTagging, setBatchTagging] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchGrouping, setBatchGrouping] = useState(false);

  const [gridDraggedId, setGridDraggedId] = useState<string | null>(null);
  const [gridDragOverId, setGridDragOverId] = useState<string | null>(null);

  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'single' | 'batch';
    imageId?: string;
    imageIds?: string[];
  } | null>(null);
  const [modalDeleting, setModalDeleting] = useState(false);

  const [primaryImageId, setPrimaryImageId] = useState<string | null>(
    initialPrimaryImageId,
  );

  const hasSelection = selectedIds.size > 0;

  useEffect(() => {
    if (!enabledTags.length || !images.length) return;

    async function loadTags() {
      try {
        const ids = images.map((img) => img.id);
        const tags = await getImageTagsBatch(ids);
        const map = new Map<string, Set<string>>();
        for (const [imageId, tagList] of tags) {
          map.set(
            imageId,
            new Set(tagList.map((tag) => tag.id)),
          );
        }
        images.forEach((img) => {
          if (!map.has(img.id)) {
            map.set(img.id, new Set());
          }
        });
        setImageTagsMap(map);
      } catch (error) {
        console.error('Failed to load image tags:', error);
      }
    }

    loadTags();
  }, [enabledTags.length, images]);

  const handleSelectImage = useCallback(
    (imageId: string, index: number, event: React.MouseEvent) => {
      event.stopPropagation();

      const toggle = (ids: Set<string>, id: string) => {
        const next = new Set(ids);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      };

      if (event.shiftKey && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const rangeIds = images.slice(start, end + 1).map((img) => img.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((id) => next.add(id));
          return next;
        });
      } else if (event.metaKey || event.ctrlKey) {
        setSelectedIds((prev) => toggle(prev, imageId));
      } else {
        setSelectedIds((prev) => toggle(prev, imageId));
      }
      setLastSelectedIndex(index);
    },
    [images, lastSelectedIndex],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }, [images]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowBatchTagPanel(false);
  }, []);

  const handleBatchAddTag = useCallback(
    async (tagId: string) => {
      if (!selectedIds.size) return;
      setBatchTagging(true);
      try {
        const updates = Array.from(selectedIds).map(async (imageId) => {
          const tags = imageTagsMap.get(imageId) || new Set();
          if (!tags.has(tagId)) {
            await addTagToImage(imageId, tagId);
          }
        });
        await Promise.all(updates);
        setImageTagsMap((prev) => {
          const next = new Map(prev);
          selectedIds.forEach((id) => {
            const tags = new Set(next.get(id) || []);
            tags.add(tagId);
            next.set(id, tags);
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to add tag:', error);
      } finally {
        setBatchTagging(false);
      }
    },
    [selectedIds, imageTagsMap],
  );

  const handleBatchRemoveTag = useCallback(
    async (tagId: string) => {
      if (!selectedIds.size) return;
      setBatchTagging(true);
      try {
        const updates = Array.from(selectedIds).map(async (imageId) => {
          const tags = imageTagsMap.get(imageId) || new Set();
          if (tags.has(tagId)) {
            await removeTagFromImage(imageId, tagId);
          }
        });
        await Promise.all(updates);
        setImageTagsMap((prev) => {
          const next = new Map(prev);
          selectedIds.forEach((id) => {
            const tags = new Set(next.get(id) || []);
            tags.delete(tagId);
            next.set(id, tags);
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to remove tag:', error);
      } finally {
        setBatchTagging(false);
      }
    },
    [selectedIds, imageTagsMap],
  );

  const getBatchTagState = useCallback(
    (tagId: string): 'all' | 'some' | 'none' => {
      if (!selectedIds.size) return 'none';
      let withTag = 0;
      selectedIds.forEach((id) => {
        const tags = imageTagsMap.get(id) || new Set();
        if (tags.has(tagId)) {
          withTag += 1;
        }
      });
      if (withTag === 0) return 'none';
      if (withTag === selectedIds.size) return 'all';
      return 'some';
    },
    [imageTagsMap, selectedIds],
  );

  const handleBatchDelete = useCallback(() => {
    if (!selectedIds.size) return;
    setDeleteModalTarget({
      type: 'batch',
      imageIds: Array.from(selectedIds),
    });
  }, [selectedIds]);

  const executeBatchDelete = useCallback(
    async (imageIds: string[]) => {
      setBatchDeleting(true);
      try {
        await Promise.all(imageIds.map((id) => deleteImageWithCleanup(id)));
        if (primaryImageId && imageIds.includes(primaryImageId)) {
          setPrimaryImageId(null);
          onPrimaryImageChange?.(null);
        }
        setImages((prev) => prev.filter((img) => !imageIds.includes(img.id)));
        setSelectedIds(new Set());
        setShowBatchTagPanel(false);
        router.refresh();
      } catch (error) {
        console.error('Failed to delete images:', error);
        throw error;
      } finally {
        setBatchDeleting(false);
      }
    },
    [primaryImageId, onPrimaryImageChange, router],
  );

  const handleDeleteFromGrid = useCallback((imageId: string) => {
    setDeleteModalTarget({ type: 'single', imageId });
  }, []);

  const executeDeleteSingle = useCallback(
    async (imageId: string) => {
      setModalDeleting(true);
      try {
        await deleteImageWithCleanup(imageId);
        if (primaryImageId === imageId) {
          setPrimaryImageId(null);
          onPrimaryImageChange?.(null);
        }
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
        router.refresh();
      } catch (error) {
        console.error('Failed to delete image:', error);
        throw error;
      } finally {
        setModalDeleting(false);
      }
    },
    [primaryImageId, onPrimaryImageChange, router],
  );

  const handleBatchGroup = useCallback(async () => {
    if (selectedIds.size < 2) return;
    setBatchGrouping(true);
    try {
      await mergeImagesIntoGroup(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowBatchTagPanel(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to group images:', error);
    } finally {
      setBatchGrouping(false);
    }
  }, [router, selectedIds]);

  const handleGridDragStart = useCallback((imageId: string, e: React.DragEvent) => {
    setGridDraggedId(imageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', imageId);
  }, []);

  const handleGridDragOver = useCallback(
    (targetId: string, e: React.DragEvent) => {
      e.preventDefault();
      if (gridDraggedId !== targetId) {
        setGridDragOverId(targetId);
      }
    },
    [gridDraggedId],
  );

  const handleGridDragLeave = useCallback(() => {
    setGridDragOverId(null);
  }, []);

  const handleGridDrop = useCallback(
    async (targetId: string, targetImage: CogImageWithGroupInfo, e: React.DragEvent) => {
      e.preventDefault();
      setGridDragOverId(null);
      if (!gridDraggedId || gridDraggedId === targetId) {
        setGridDraggedId(null);
        return;
      }
      const targetGroupId = targetImage.group_id || targetId;
      try {
        await addImageToGroup(gridDraggedId, targetGroupId);
        setGridDraggedId(null);
        router.refresh();
      } catch (error) {
        console.error('Failed to move image into group:', error);
        setGridDraggedId(null);
      }
    },
    [gridDraggedId, router],
  );

  const handleGridDragEnd = useCallback(() => {
    setGridDraggedId(null);
    setGridDragOverId(null);
  }, []);

  const getStarRating = useCallback((image: CogImageWithGroupInfo) => {
    return image.star_rating ?? 0;
  }, []);

  const handleBatchTagClose = useCallback(() => {
    setShowBatchTagPanel(false);
  }, []);

  const selectedImages = useMemo(
    () => images.filter((img) => selectedIds.has(img.id)),
    [images, selectedIds],
  );

  return (
    <div className="space-y-4">
      {hasSelection && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedIds.size} selected</span>
            <button className="text-muted-foreground hover:text-foreground" onClick={handleSelectAll}>
              Select all ({images.length})
            </button>
            <button className="text-muted-foreground hover:text-foreground" onClick={handleClearSelection}>
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size >= 2 && (
              <Button variant="outline" size="sm" onClick={handleBatchGroup} disabled={batchGrouping}>
                {batchGrouping ? 'Grouping…' : 'Group'}
              </Button>
            )}
            {enabledTags.length > 0 && (
              <Button
                variant={showBatchTagPanel ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowBatchTagPanel((prev) => !prev)}
                disabled={batchTagging}
              >
                Tags
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
            >
              {batchDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}

      <div
        className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${
          isDragOver ? 'rounded-lg ring-2 ring-primary/40' : ''
        }`}
      >
        {uploadingFiles.map((file) => (
          <div
            key={file.id}
            className={`relative overflow-hidden rounded-lg border ${
              file.status === 'error' ? 'border-destructive' : 'border-primary'
            }`}
          >
            <img
              src={file.preview}
              alt={file.file.name}
              className="h-full w-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-sm">
              {file.status === 'uploading'
                ? 'Uploading…'
                : file.status === 'success'
                  ? 'Done'
                  : file.error || 'Failed'}
            </div>
          </div>
        ))}

        {images.map((image, index) => {
          const isSelected = selectedIds.has(image.id);
          const tagCount = (imageTagsMap.get(image.id) || new Set()).size;
          const groupCount = image.group_count || 1;
          const isPrimary = image.id === primaryImageId;
          const isDragTarget = gridDragOverId === image.id;

          return (
            <div
              key={image.id}
              className={`group relative overflow-hidden transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/40'
                  : isDragTarget
                    ? 'border-blue-400 ring-2 ring-blue-400/40'
                    : 'hover:border-primary/40'
              }`}
              draggable={!hasSelection}
              onDragStart={(e) => handleGridDragStart(image.id, e)}
              onDragOver={(e) => handleGridDragOver(image.id, e)}
              onDragLeave={handleGridDragLeave}
              onDrop={(e) => handleGridDrop(image.id, image, e)}
              onDragEnd={handleGridDragEnd}
            >
              <button
                onClick={(e) => handleSelectImage(image.id, index, e)}
                className={`absolute left-2 top-2 z-10 h-6 w-6 rounded border-2 ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : hasSelection
                      ? 'border-white/60 bg-black/40 text-white opacity-70'
                      : 'border-white/60 bg-black/40 text-white opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && '✓'}
              </button>
              <button
                className="w-full text-left"
                onClick={() => router.push(`/tools/cog/${seriesId}/editor/${image.id}`)}
              >
                <div className="relative aspect-square bg-muted">
                  <CogGridImage
                    storagePath={image.storage_path}
                    alt={image.filename}
                    thumbnail256={image.thumbnail_256}
                    thumbnail128={image.thumbnail_128}
                    fill
                    className={`object-cover ${isSelected ? 'opacity-80' : ''}`}
                  />
                  {tagCount > 0 && (
                    <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                      {tagCount} tag{tagCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {groupCount > 1 && (
                    <div className="absolute bottom-2 right-2 rounded bg-blue-600/80 px-1.5 py-0.5 text-[10px] text-white">
                      {groupCount}
                    </div>
                  )}
                  {isPrimary && (
                    <div className="absolute right-2 top-2 text-yellow-400" title="Primary image">
                      ★
                    </div>
                  )}
                  {getStarRating(image) > 0 && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
                      <StarRating rating={getStarRating(image)} size="sm" />
                    </div>
                  )}
                </div>
              </button>
              {!hasSelection && (
                <button
                  className="absolute right-2 top-2 rounded bg-white/80 p-1 text-xs text-destructive opacity-0 transition group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFromGrid(image.id);
                  }}
                  title="Delete image"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showBatchTagPanel && hasSelection && (
        <BatchTagPanel
          selectedCount={selectedIds.size}
          enabledTags={enabledTags}
          getTagState={getBatchTagState}
          onAddTag={handleBatchAddTag}
          onRemoveTag={handleBatchRemoveTag}
          onClose={handleBatchTagClose}
          isLoading={batchTagging}
        />
      )}

      {deleteModalTarget && (
        <DeleteConfirmationModal
          images={images}
          imageIds={
            deleteModalTarget.type === 'batch'
              ? deleteModalTarget.imageIds || []
              : deleteModalTarget.imageId
                ? [deleteModalTarget.imageId]
                : []
          }
          primaryImageId={primaryImageId}
          isDeleting={modalDeleting || batchDeleting}
          onCancel={() => setDeleteModalTarget(null)}
          onConfirm={async () => {
            if (deleteModalTarget.type === 'batch' && deleteModalTarget.imageIds) {
              await executeBatchDelete(deleteModalTarget.imageIds);
            } else if (deleteModalTarget.imageId) {
              await executeDeleteSingle(deleteModalTarget.imageId);
            }
            setDeleteModalTarget(null);
          }}
        />
      )}
    </div>
  );
}
