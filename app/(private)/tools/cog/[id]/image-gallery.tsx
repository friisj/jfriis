'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCogImageUrl, deleteImageWithCleanup, toggleImageTag, getImageTagsBatch, getImageVersionChain, getImageById, addTagToImage, removeTagFromImage } from '@/lib/cog';
import { Button } from '@/components/ui/button';
import { LightboxEditMode } from './lightbox-edit-mode';
import { VersionHistoryPanel } from './version-history-panel';
import type { CogImage, CogTag, CogTagWithGroup, CogImageWithVersions } from '@/lib/types/cog';

interface ImageGalleryProps {
  images: CogImageWithVersions[];
  seriesId: string;
  primaryImageId?: string | null;
  enabledTags?: CogTagWithGroup[];
  onPrimaryImageChange?: (imageId: string | null) => void;
}

// Batch Tag Panel - similar to TagPanel but for batch operations
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
  // Group tags by their group
  const tagsByGroup = useMemo(() => {
    const groups = new Map<string | null, { name: string | null; color: string | null; tags: CogTagWithGroup[] }>();

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-background border border-border rounded-lg shadow-xl p-4 w-[90vw] max-w-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Batch Tag {selectedCount} Images</h3>
          <p className="text-xs text-muted-foreground">Click to add, click again to remove from all</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm p-1"
          aria-label="Close batch tag panel"
        >
          ×
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">Updating tags...</span>
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {tagsByGroup.map(([groupId, group]) => (
            <div key={groupId || 'ungrouped'}>
              {group.name && (
                <p
                  className="text-xs text-muted-foreground mb-1.5"
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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-all ${
                        state === 'all'
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : state === 'some'
                          ? 'bg-muted text-foreground border border-border'
                          : 'text-muted-foreground border border-border hover:border-foreground/40'
                      }`}
                      style={{
                        borderColor: state !== 'none' && color ? color : undefined,
                        backgroundColor: state === 'all' && color ? `${color}30` : undefined,
                      }}
                    >
                      {/* Checkbox indicator */}
                      <span className="w-4 h-4 flex items-center justify-center">
                        {state === 'all' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        {state === 'some' && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                      </span>
                      <span>{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {enabledTags.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No tags enabled for this series. Configure tags in the series settings.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Delete Confirmation Modal - shows what will be deleted
function DeleteConfirmationModal({
  images,
  imageIds,
  primaryImageId,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  images: CogImageWithVersions[];
  imageIds: string[];
  primaryImageId: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  const imagesToDelete = images.filter((img) => imageIds.includes(img.id));
  const count = imagesToDelete.length;
  const isPrimaryIncluded = primaryImageId && imageIds.includes(primaryImageId);
  const totalVersions = imagesToDelete.reduce((sum, img) => sum + (img.version_count || 1), 0);
  const hasVersions = totalVersions > count;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-destructive">
            Delete {count} Image{count !== 1 ? 's' : ''}?
          </h2>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The following will be permanently deleted:
          </p>

          <ul className="text-sm space-y-1.5 text-foreground">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {count} image{count !== 1 ? 's' : ''} from storage
            </li>
            {hasVersions && (
              <li className="flex items-center gap-2 text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Including {totalVersions - count} version{totalVersions - count !== 1 ? 's' : ''} in chains
              </li>
            )}
            {isPrimaryIncluded && (
              <li className="flex items-center gap-2 text-amber-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Primary image will be cleared
              </li>
            )}
          </ul>

          {/* Preview thumbnails (max 4) */}
          {count <= 6 && (
            <div className="flex gap-2 pt-2">
              {imagesToDelete.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative w-12 h-12 rounded overflow-hidden border border-border"
                >
                  <img
                    src={getCogImageUrl(img.storage_path)}
                    alt={img.filename}
                    className="w-full h-full object-cover"
                  />
                  {img.id === primaryImageId && (
                    <div className="absolute top-0 right-0 text-yellow-400 text-[8px]">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              {count > 4 && (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  +{count - 4}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : `Delete ${count} Image${count !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TagPanel({
  imageId,
  enabledTags,
  appliedTagIds,
  onToggle,
  isExpanded,
  onClose,
}: {
  imageId: string;
  enabledTags: CogTagWithGroup[];
  appliedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  isExpanded: boolean;
  onClose: () => void;
}) {
  // Group tags by their group - must be called before any early returns
  const tagsByGroup = useMemo(() => {
    const groups = new Map<string | null, { name: string | null; color: string | null; tags: CogTagWithGroup[] }>();

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
      // Ungrouped last
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return 0;
    });
  }, [enabledTags]);

  if (!isExpanded) {
    return null;
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-white/20 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white text-sm font-medium">Tags</h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm"
          aria-label="Close tag panel"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 max-h-48 overflow-y-auto">
        {tagsByGroup.map(([groupId, group]) => (
          <div key={groupId || 'ungrouped'}>
            {group.name && (
              <p
                className="text-xs text-white/50 mb-1.5"
                style={{ color: group.color ? `${group.color}80` : undefined }}
              >
                {group.name}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {group.tags.map((tag, index) => {
                const isApplied = appliedTagIds.has(tag.id);
                const shortcutKey = tag.shortcut || (index < 9 ? String(index + 1) : null);
                const color = tag.color || group.color;

                return (
                  <button
                    key={tag.id}
                    onClick={() => onToggle(tag.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm transition-all ${
                      isApplied
                        ? 'bg-white/20 text-white border border-white/40'
                        : 'text-white/70 border border-white/20 hover:border-white/40'
                    }`}
                    style={{
                      borderColor: isApplied && color ? color : undefined,
                      backgroundColor: isApplied && color ? `${color}30` : undefined,
                    }}
                  >
                    {shortcutKey && (
                      <kbd className="text-[10px] px-1 py-0.5 bg-white/10 rounded font-mono">
                        {shortcutKey}
                      </kbd>
                    )}
                    <span>{tag.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {enabledTags.length === 0 && (
          <p className="text-white/50 text-sm">
            No tags enabled for this series. Configure tags in the series settings.
          </p>
        )}
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
}: ImageGalleryProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [showEditMode, setShowEditMode] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [imageTagsMap, setImageTagsMap] = useState<Map<string, Set<string>>>(new Map());
  const [loadingTags, setLoadingTags] = useState(false);

  // Version navigation state
  const [versionChain, setVersionChain] = useState<CogImage[]>([]);
  const [versionIndex, setVersionIndex] = useState<number>(0);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [showBatchTagPanel, setShowBatchTagPanel] = useState(false);
  const [batchTagging, setBatchTagging] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Delete confirmation modal state (for grid + batch deletes)
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'single' | 'batch';
    imageId?: string;
    imageIds?: string[];
  } | null>(null);
  const [modalDeleting, setModalDeleting] = useState(false);

  // Primary image state
  const [primaryImageId, setPrimaryImageId] = useState<string | null>(initialPrimaryImageId);

  const isOpen = selectedIndex !== null;
  const hasSelection = selectedIds.size > 0;

  // Load tags for all images on mount
  useEffect(() => {
    if (images.length === 0 || enabledTags.length === 0) return;

    async function loadTags() {
      setLoadingTags(true);
      try {
        const imageIds = images.map((img) => img.id);
        const tagsBatch = await getImageTagsBatch(imageIds);

        const newMap = new Map<string, Set<string>>();
        for (const [imageId, tags] of tagsBatch) {
          newMap.set(imageId, new Set(tags.map((t) => t.id)));
        }
        // Initialize empty sets for images without tags
        for (const img of images) {
          if (!newMap.has(img.id)) {
            newMap.set(img.id, new Set());
          }
        }
        setImageTagsMap(newMap);
      } catch (error) {
        console.error('Failed to load image tags:', error);
      } finally {
        setLoadingTags(false);
      }
    }

    loadTags();
  }, [images, enabledTags.length]);

  // Load version chain when lightbox opens for an image with versions
  useEffect(() => {
    if (selectedIndex === null) {
      setVersionChain([]);
      setVersionIndex(0);
      return;
    }

    const rootImage = images[selectedIndex];
    if (!rootImage || rootImage.version_count <= 1) {
      // No versions, just show the single image
      setVersionChain([rootImage]);
      setVersionIndex(0);
      return;
    }

    // Load the full version chain
    async function loadVersionChain() {
      setLoadingVersions(true);
      try {
        const chain = await getImageVersionChain(rootImage.id);
        setVersionChain(chain);
        // Start at the root (index 0)
        setVersionIndex(0);
      } catch (error) {
        console.error('Failed to load version chain:', error);
        setVersionChain([rootImage]);
        setVersionIndex(0);
      } finally {
        setLoadingVersions(false);
      }
    }

    loadVersionChain();
  }, [selectedIndex, images]);

  const openImage = (index: number) => {
    setSelectedIndex(index);
    setShowDeleteConfirm(false);
    setShowEditMode(false);
    setShowVersionPanel(false);
  };

  const closeGallery = () => {
    setSelectedIndex(null);
    setShowDeleteConfirm(false);
    setShowTagPanel(false);
    setShowEditMode(false);
    setShowVersionPanel(false);
  };

  const goToPrevious = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex > 0 ? selectedIndex - 1 : images.length - 1);
    setShowDeleteConfirm(false);
  }, [selectedIndex, images.length]);

  const goToNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex < images.length - 1 ? selectedIndex + 1 : 0);
    setShowDeleteConfirm(false);
  }, [selectedIndex, images.length]);

  // Version navigation (up = older/parent, down = newer/child)
  const goToOlderVersion = useCallback(() => {
    if (versionChain.length <= 1) return;
    setVersionIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, [versionChain.length]);

  const goToNewerVersion = useCallback(() => {
    if (versionChain.length <= 1) return;
    setVersionIndex((prev) => (prev < versionChain.length - 1 ? prev + 1 : prev));
  }, [versionChain.length]);

  const handleDelete = useCallback(async () => {
    if (selectedIndex === null) return;
    const imageToDelete = images[selectedIndex];

    setDeleting(true);
    try {
      await deleteImageWithCleanup(imageToDelete.id);

      // If primary was deleted, update local state
      if (primaryImageId === imageToDelete.id) {
        setPrimaryImageId(null);
        onPrimaryImageChange?.(null);
      }

      // Remove from local state
      const newImages = images.filter((_, i) => i !== selectedIndex);
      setImages(newImages);

      // Adjust selected index or close if no images left
      if (newImages.length === 0) {
        closeGallery();
      } else if (selectedIndex >= newImages.length) {
        setSelectedIndex(newImages.length - 1);
      }

      setShowDeleteConfirm(false);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setDeleting(false);
    }
  }, [selectedIndex, images, router, primaryImageId, onPrimaryImageChange]);

  // Open delete confirmation modal for a single image from grid
  const handleDeleteFromGrid = useCallback(
    (imageId: string) => {
      setDeleteModalTarget({ type: 'single', imageId });
    },
    []
  );

  // Execute single image delete after modal confirmation
  const executeDeleteSingle = useCallback(
    async (imageId: string) => {
      try {
        await deleteImageWithCleanup(imageId);

        // If primary was deleted, update local state
        if (primaryImageId === imageId) {
          setPrimaryImageId(null);
          onPrimaryImageChange?.(null);
        }

        setImages(images.filter((img) => img.id !== imageId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(imageId);
          return next;
        });
        router.refresh();
      } catch (error) {
        console.error('Failed to delete image:', error);
        throw error;
      }
    },
    [images, router, primaryImageId, onPrimaryImageChange]
  );

  // Multi-select handlers
  const handleSelectImage = useCallback(
    (imageId: string, index: number, event: React.MouseEvent) => {
      event.stopPropagation();

      if (event.shiftKey && lastSelectedIndex !== null) {
        // Shift-click: select range
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const rangeIds = images.slice(start, end + 1).map((img) => img.id);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          rangeIds.forEach((id) => next.add(id));
          return next;
        });
      } else if (event.metaKey || event.ctrlKey) {
        // Cmd/Ctrl-click: toggle single
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(imageId)) {
            next.delete(imageId);
          } else {
            next.add(imageId);
          }
          return next;
        });
      } else {
        // Regular click: toggle single
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(imageId)) {
            next.delete(imageId);
          } else {
            next.add(imageId);
          }
          return next;
        });
      }
      setLastSelectedIndex(index);
    },
    [images, lastSelectedIndex]
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(images.map((img) => img.id)));
  }, [images]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowBatchTagPanel(false);
  }, []);

  // Batch tag operations
  const handleBatchAddTag = useCallback(
    async (tagId: string) => {
      if (selectedIds.size === 0) return;
      setBatchTagging(true);

      try {
        // Add tag to all selected images that don't have it
        const promises = Array.from(selectedIds).map(async (imageId) => {
          const currentTags = imageTagsMap.get(imageId) || new Set();
          if (!currentTags.has(tagId)) {
            await addTagToImage(imageId, tagId);
          }
        });
        await Promise.all(promises);

        // Update local state
        setImageTagsMap((prev) => {
          const next = new Map(prev);
          selectedIds.forEach((imageId) => {
            const tags = new Set(next.get(imageId) || []);
            tags.add(tagId);
            next.set(imageId, tags);
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to batch add tag:', error);
      } finally {
        setBatchTagging(false);
      }
    },
    [selectedIds, imageTagsMap]
  );

  const handleBatchRemoveTag = useCallback(
    async (tagId: string) => {
      if (selectedIds.size === 0) return;
      setBatchTagging(true);

      try {
        // Remove tag from all selected images that have it
        const promises = Array.from(selectedIds).map(async (imageId) => {
          const currentTags = imageTagsMap.get(imageId) || new Set();
          if (currentTags.has(tagId)) {
            await removeTagFromImage(imageId, tagId);
          }
        });
        await Promise.all(promises);

        // Update local state
        setImageTagsMap((prev) => {
          const next = new Map(prev);
          selectedIds.forEach((imageId) => {
            const tags = new Set(next.get(imageId) || []);
            tags.delete(tagId);
            next.set(imageId, tags);
          });
          return next;
        });
      } catch (error) {
        console.error('Failed to batch remove tag:', error);
      } finally {
        setBatchTagging(false);
      }
    },
    [selectedIds, imageTagsMap]
  );

  // Open delete confirmation modal for batch delete
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    setDeleteModalTarget({ type: 'batch', imageIds: Array.from(selectedIds) });
  }, [selectedIds]);

  // Execute batch delete after modal confirmation
  const executeBatchDelete = useCallback(
    async (imageIds: string[]) => {
      setBatchDeleting(true);
      try {
        // Delete all selected images in parallel using proper cleanup
        const promises = imageIds.map((imageId) => deleteImageWithCleanup(imageId));
        await Promise.all(promises);

        // If primary was deleted, update local state
        if (primaryImageId && imageIds.includes(primaryImageId)) {
          setPrimaryImageId(null);
          onPrimaryImageChange?.(null);
        }

        // Update local state
        setImages((prev) => prev.filter((img) => !imageIds.includes(img.id)));

        // Clear selection
        setSelectedIds(new Set());
        setShowBatchTagPanel(false);

        router.refresh();
      } catch (error) {
        console.error('Failed to batch delete:', error);
        throw error;
      } finally {
        setBatchDeleting(false);
      }
    },
    [router, primaryImageId, onPrimaryImageChange]
  );

  // Get tag application state for batch selection (all, some, none)
  const getBatchTagState = useCallback(
    (tagId: string): 'all' | 'some' | 'none' => {
      if (selectedIds.size === 0) return 'none';
      let hasCount = 0;
      selectedIds.forEach((imageId) => {
        const tags = imageTagsMap.get(imageId) || new Set();
        if (tags.has(tagId)) hasCount++;
      });
      if (hasCount === 0) return 'none';
      if (hasCount === selectedIds.size) return 'all';
      return 'some';
    },
    [selectedIds, imageTagsMap]
  );

  // Handle edit success - show the new image immediately
  const handleEditSuccess = useCallback(
    async (newImageId: string) => {
      try {
        // Fetch the new image
        const newImage = await getImageById(newImageId);

        // Add it to the version chain (new versions go at the end)
        setVersionChain((prev) => [...prev, newImage]);

        // Navigate to the new image (last in chain)
        setVersionIndex((prev) => prev + 1);

        // Close edit mode
        setShowEditMode(false);
      } catch (error) {
        console.error('Failed to load new image:', error);
        // Fallback to refresh
        router.refresh();
      }
    },
    [router]
  );

  // Handle version selection from history panel
  const handleVersionSelect = useCallback(
    (image: CogImage) => {
      // Find the index of the selected version in our chain
      const idx = versionChain.findIndex((v) => v.id === image.id);
      if (idx >= 0) {
        setVersionIndex(idx);
      }
      setShowVersionPanel(false);
    },
    [versionChain]
  );

  // Handle primary image change
  const handlePrimaryChanged = useCallback(
    (imageId: string | null) => {
      setPrimaryImageId(imageId);
      onPrimaryImageChange?.(imageId);
    },
    [onPrimaryImageChange]
  );

  // Handle version deletion
  const handleVersionDeleted = useCallback(
    (deletedImageId: string, newActiveImage: CogImage | null) => {
      // Update version chain
      setVersionChain((prev) => prev.filter((v) => v.id !== deletedImageId));

      // If we deleted the current image, switch to the new active one
      if (newActiveImage) {
        const newIdx = versionChain.findIndex((v) => v.id === newActiveImage.id);
        if (newIdx >= 0) {
          setVersionIndex(Math.max(0, newIdx - (deletedImageId === versionChain[newIdx]?.id ? 1 : 0)));
        }
      }

      // Update images list if the deleted image was a root
      setImages((prev) => prev.filter((img) => img.id !== deletedImageId));

      // If primary was deleted, it's already cleared by deleteImageWithCleanup
      if (primaryImageId === deletedImageId) {
        setPrimaryImageId(null);
        onPrimaryImageChange?.(null);
      }

      router.refresh();
    },
    [versionChain, primaryImageId, onPrimaryImageChange, router]
  );

  // Handle tag toggle with optimistic update
  const handleToggleTag = useCallback(
    async (tagId: string) => {
      if (selectedIndex === null) return;
      const currentImage = images[selectedIndex];

      // Optimistic update
      setImageTagsMap((prev) => {
        const newMap = new Map(prev);
        const currentTags = new Set(newMap.get(currentImage.id) || []);
        if (currentTags.has(tagId)) {
          currentTags.delete(tagId);
        } else {
          currentTags.add(tagId);
        }
        newMap.set(currentImage.id, currentTags);
        return newMap;
      });

      // Persist in background
      try {
        await toggleImageTag(currentImage.id, tagId);
      } catch (error) {
        console.error('Failed to toggle tag:', error);
        // Revert on error
        setImageTagsMap((prev) => {
          const newMap = new Map(prev);
          const currentTags = new Set(newMap.get(currentImage.id) || []);
          if (currentTags.has(tagId)) {
            currentTags.delete(tagId);
          } else {
            currentTags.add(tagId);
          }
          newMap.set(currentImage.id, currentTags);
          return newMap;
        });
      }
    },
    [selectedIndex, images]
  );

  // Grid-level keyboard handling (when lightbox is NOT open)
  useEffect(() => {
    if (isOpen) return; // Only active when lightbox is closed

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: close batch tag panel or clear selection
      if (e.key === 'Escape') {
        if (showBatchTagPanel) {
          e.preventDefault();
          setShowBatchTagPanel(false);
        } else if (hasSelection) {
          e.preventDefault();
          handleClearSelection();
        }
        return;
      }

      // Cmd/Ctrl+A: select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showBatchTagPanel, hasSelection, handleClearSelection, handleSelectAll]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if edit mode is active
      if (showEditMode) {
        return;
      }

      // Don't handle keys if delete confirm is showing
      if (showDeleteConfirm) {
        if (e.key === 'Escape') {
          setShowDeleteConfirm(false);
        }
        return;
      }

      // 'r' or 'e' opens edit mode
      if (e.key === 'r' || e.key === 'R' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        setShowEditMode(true);
        setShowTagPanel(false);
        setShowVersionPanel(false);
        return;
      }

      // 'v' toggles version panel
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setShowVersionPanel((prev) => !prev);
        setShowTagPanel(false);
        return;
      }

      // 't' toggles tag panel
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setShowTagPanel((prev) => !prev);
        setShowVersionPanel(false);
        return;
      }

      // If tag panel is open, handle number keys for quick tagging
      if (showTagPanel && enabledTags.length > 0) {
        // Check for shortcut keys
        const tagWithShortcut = enabledTags.find((tag) => tag.shortcut === e.key);
        if (tagWithShortcut) {
          e.preventDefault();
          handleToggleTag(tagWithShortcut.id);
          return;
        }

        // Check for number keys 1-9
        if (/^[1-9]$/.test(e.key)) {
          const tagIndex = parseInt(e.key, 10) - 1;
          if (tagIndex < enabledTags.length) {
            e.preventDefault();
            handleToggleTag(enabledTags[tagIndex].id);
            return;
          }
        }

        // Escape closes tag panel
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowTagPanel(false);
          return;
        }
      }

      // If version panel is open, Escape closes it
      if (showVersionPanel && e.key === 'Escape') {
        e.preventDefault();
        setShowVersionPanel(false);
        return;
      }

      switch (e.key) {
        case 'Escape':
          closeGallery();
          break;
        // Horizontal: navigate between images in grid
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          goToNext();
          break;
        // Vertical: navigate between versions (up = older, down = newer)
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          if (versionChain.length > 1) {
            goToOlderVersion();
          } else {
            goToPrevious();
          }
          break;
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          if (versionChain.length > 1) {
            goToNewerVersion();
          } else {
            goToNext();
          }
          break;
        case 'd':
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          setShowDeleteConfirm(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext, goToOlderVersion, goToNewerVersion, versionChain.length, showDeleteConfirm, showTagPanel, showVersionPanel, showEditMode, enabledTags, handleToggleTag]);

  // Prevent body scroll when gallery is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Root image from grid selection
  const rootImage = selectedIndex !== null ? images[selectedIndex] : null;
  // Currently displayed image (may be a version)
  const currentImage = versionChain.length > 0 ? versionChain[versionIndex] : rootImage;
  const currentImageTags: Set<string> = currentImage ? imageTagsMap.get(currentImage.id) || new Set<string>() : new Set<string>();

  // Get applied tag names for display
  const appliedTagNames = useMemo(() => {
    return enabledTags.filter((t) => currentImageTags.has(t.id)).map((t) => t.name);
  }, [enabledTags, currentImageTags]);

  return (
    <div className="flex-1">
      {/* Selection Action Bar */}
      {hasSelection && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border p-3 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <button
              onClick={handleSelectAll}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Select all ({images.length})
            </button>
            <button
              onClick={handleClearSelection}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            {enabledTags.length > 0 && (
              <Button
                variant={showBatchTagPanel ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBatchTagPanel((prev) => !prev)}
              >
                Tags
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDelete}
              disabled={batchDeleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
            >
              {batchDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      )}

      {/* Thumbnail Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => {
          const imageTags = imageTagsMap.get(image.id) || new Set();
          const tagCount = imageTags.size;
          const versionCount = image.version_count || 1;
          const isSelected = selectedIds.has(image.id);
          const isPrimary = image.id === primaryImageId;

          return (
            <div
              key={image.id}
              className={`group relative border rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:ring-2 ring-primary/50'
              }`}
            >
              {/* Selection checkbox - always visible when selection mode is active */}
              <button
                onClick={(e) => handleSelectImage(image.id, index, e)}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-primary border-primary text-primary-foreground'
                    : hasSelection
                    ? 'bg-black/50 border-white/60 text-white opacity-70 hover:opacity-100'
                    : 'bg-black/50 border-white/60 text-white opacity-0 group-hover:opacity-100'
                }`}
                aria-label={isSelected ? "Deselect image" : "Select image"}
              >
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              <button onClick={() => openImage(index)} className="w-full text-left">
                <div className="aspect-square bg-muted relative">
                  <img
                    src={getCogImageUrl(image.storage_path)}
                    alt={image.filename}
                    className={`w-full h-full object-cover transition-opacity ${
                      isSelected ? 'opacity-80' : ''
                    }`}
                  />
                  {/* Tag count badge */}
                  {tagCount > 0 && (
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
                      {tagCount} tag{tagCount !== 1 ? 's' : ''}
                    </div>
                  )}
                  {/* Version count badge */}
                  {versionCount > 1 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-blue-600/80 rounded text-[10px] text-white">
                      v{versionCount}
                    </div>
                  )}
                  {/* Primary star indicator */}
                  {isPrimary && (
                    <div className="absolute top-2 right-10 text-yellow-400" title="Primary image">
                      <svg className="w-5 h-5 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2 text-xs">
                  <p className="truncate">{image.filename}</p>
                  <p className="text-muted-foreground">
                    {image.source === 'generated' ? 'Generated' : 'Uploaded'}
                  </p>
                </div>
              </button>
              {/* Delete button - only visible when hovering AND holding Shift, or in selection mode */}
              {hasSelection && isSelected && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFromGrid(image.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/90 text-white transition-opacity hover:bg-red-600"
                  aria-label="Delete image"
                  title="Delete this image"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Tag Panel */}
      {showBatchTagPanel && hasSelection && (
        <BatchTagPanel
          selectedCount={selectedIds.size}
          enabledTags={enabledTags}
          getTagState={getBatchTagState}
          onAddTag={handleBatchAddTag}
          onRemoveTag={handleBatchRemoveTag}
          onClose={() => setShowBatchTagPanel(false)}
          isLoading={batchTagging}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTarget && (
        <DeleteConfirmationModal
          images={images}
          imageIds={deleteModalTarget.type === 'batch' ? deleteModalTarget.imageIds || [] : [deleteModalTarget.imageId || '']}
          primaryImageId={primaryImageId}
          isDeleting={modalDeleting}
          onCancel={() => {
            if (!modalDeleting) setDeleteModalTarget(null);
          }}
          onConfirm={async () => {
            setModalDeleting(true);
            try {
              if (deleteModalTarget.type === 'batch' && deleteModalTarget.imageIds) {
                await executeBatchDelete(deleteModalTarget.imageIds);
              } else if (deleteModalTarget.imageId) {
                await executeDeleteSingle(deleteModalTarget.imageId);
              }
              setDeleteModalTarget(null);
            } catch {
              // Error already logged in execute functions
            } finally {
              setModalDeleting(false);
            }
          }}
        />
      )}

      {/* Lightbox */}
      {isOpen && currentImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={closeGallery}>
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm">
              <span className="font-medium">
                {selectedIndex! + 1} / {images.length}
              </span>
              {versionChain.length > 1 && (
                <span className="ml-2 px-1.5 py-0.5 bg-blue-600/80 rounded text-[10px]">
                  v{versionIndex + 1}/{versionChain.length}
                </span>
              )}
              <span className="ml-4 text-white/60">{currentImage.filename}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 hidden sm:block">
                {versionChain.length > 1 ? '←→ images, ↑↓ versions' : '←→↑↓ nav'}, e edit, t tags, d delete
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditMode(true);
                  setShowTagPanel(false);
                  setShowVersionPanel(false);
                }}
                className="text-white hover:bg-white/10"
              >
                Edit
              </Button>
              {versionChain.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowVersionPanel((prev) => !prev);
                    setShowTagPanel(false);
                  }}
                  className={`hover:bg-white/10 ${showVersionPanel ? 'text-primary' : 'text-white'}`}
                >
                  Versions
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTagPanel((prev) => !prev);
                  setShowVersionPanel(false);
                }}
                className={`hover:bg-white/10 ${showTagPanel ? 'text-primary' : 'text-white'}`}
              >
                Tags
                {appliedTagNames.length > 0 && (
                  <span className="ml-1 text-xs opacity-60">({appliedTagNames.length})</span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeGallery}
                className="text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Edit Mode Overlay */}
          {showEditMode && (
            <LightboxEditMode
              imageId={currentImage.id}
              imageUrl={getCogImageUrl(currentImage.storage_path)}
              imageWidth={currentImage.width || 1024}
              imageHeight={currentImage.height || 1024}
              onClose={() => setShowEditMode(false)}
              onSuccess={handleEditSuccess}
            />
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && currentImage && (
            <div
              className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-black/90 border border-red-500/50 rounded-lg p-4 max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white text-sm mb-2">Delete this image?</p>
              {/* Contextual warnings */}
              <div className="space-y-1 mb-3">
                {versionChain.length > 1 && (
                  <p className="text-amber-400 text-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Version {versionIndex + 1} of {versionChain.length} - children will be re-parented
                  </p>
                )}
                {currentImage.id === primaryImageId && (
                  <p className="text-amber-400 text-xs flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    This is the primary image
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, delete'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Image Container */}
          <div
            className="flex-1 flex items-center justify-center relative px-16"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Previous Button */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Previous image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Main Image */}
            <img
              src={getCogImageUrl(currentImage.storage_path)}
              alt={currentImage.filename}
              className={`max-w-full object-contain transition-all ${
                showTagPanel || showVersionPanel ? 'max-h-[calc(100vh-280px)]' : 'max-h-[calc(100vh-180px)]'
              }`}
            />

            {/* Next Button */}
            <button
              onClick={goToNext}
              className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
              aria-label="Next image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Footer - Tags/Versions + Image Info */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            {/* Collapsed bar */}
            {!showTagPanel && !showVersionPanel && (
              <div className="px-4 py-2 border-t border-white/10 flex items-center gap-4">
                {enabledTags.length > 0 && (
                  <button
                    onClick={() => setShowTagPanel(true)}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm"
                  >
                    <kbd className="text-[10px] px-1 py-0.5 bg-white/10 rounded font-mono">t</kbd>
                    <span>Tags:</span>
                    {appliedTagNames.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {appliedTagNames.map((name) => (
                          <span
                            key={name}
                            className="px-1.5 py-0.5 bg-white/20 rounded text-xs text-white"
                          >
                            {name}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-white/40">None</span>
                    )}
                  </button>
                )}
                {versionChain.length > 1 && (
                  <button
                    onClick={() => setShowVersionPanel(true)}
                    className="flex items-center gap-2 text-white/60 hover:text-white text-sm"
                  >
                    <kbd className="text-[10px] px-1 py-0.5 bg-white/10 rounded font-mono">↑↓</kbd>
                    <span>Version {versionIndex + 1} of {versionChain.length}</span>
                  </button>
                )}
              </div>
            )}

            {/* Tag Panel (expanded) */}
            <TagPanel
              imageId={currentImage.id}
              enabledTags={enabledTags}
              appliedTagIds={currentImageTags}
              onToggle={handleToggleTag}
              isExpanded={showTagPanel}
              onClose={() => setShowTagPanel(false)}
            />

            {/* Version History Panel */}
            <VersionHistoryPanel
              imageId={currentImage.id}
              seriesId={seriesId}
              primaryImageId={primaryImageId}
              isExpanded={showVersionPanel}
              onClose={() => setShowVersionPanel(false)}
              onSelectVersion={handleVersionSelect}
              onPrimaryChanged={handlePrimaryChanged}
              onVersionDeleted={handleVersionDeleted}
            />

            {/* Prompt info */}
            {currentImage.prompt && !showTagPanel && !showVersionPanel && (
              <div className="p-4 text-white/60 text-sm border-t border-white/10">
                <p className="line-clamp-2 max-w-3xl mx-auto text-center">{currentImage.prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
