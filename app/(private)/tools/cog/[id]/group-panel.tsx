'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCogImageUrl, getImageGroup, setSeriesPrimaryImage, deleteImageWithCleanup } from '@/lib/cog';
import type { CogImage } from '@/lib/types/cog';

interface GroupPanelProps {
  imageId: string;
  seriesId: string;
  primaryImageId: string | null;
  isExpanded: boolean;
  onClose: () => void;
  onSelectImage: (image: CogImage) => void;
  onPrimaryChanged?: (imageId: string | null) => void;
  onImageDeleted?: (deletedImageId: string, newActiveImage: CogImage | null) => void;
}

export function GroupPanel({
  imageId,
  seriesId,
  primaryImageId,
  isExpanded,
  onClose,
  onSelectImage,
  onPrimaryChanged,
  onImageDeleted,
}: GroupPanelProps) {
  const [groupImages, setGroupImages] = useState<CogImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Load group images when panel expands
  useEffect(() => {
    if (!isExpanded || !imageId) return;

    async function loadGroup() {
      setLoading(true);
      setError(null);
      try {
        const images = await getImageGroup(imageId);
        setGroupImages(images);
      } catch (err) {
        console.error('Failed to load group:', err);
        setError('Failed to load group');
      } finally {
        setLoading(false);
      }
    }

    loadGroup();
  }, [imageId, isExpanded]);

  // Handle star toggle (set/clear primary image)
  const handleTogglePrimary = useCallback(async (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionInProgress(imgId);

    try {
      // If clicking the current primary, clear it; otherwise set this as primary
      const newPrimaryId = primaryImageId === imgId ? null : imgId;
      await setSeriesPrimaryImage(seriesId, newPrimaryId);
      onPrimaryChanged?.(newPrimaryId);
    } catch (err) {
      console.error('Failed to set primary image:', err);
      setError('Failed to set primary image');
    } finally {
      setActionInProgress(null);
    }
  }, [seriesId, primaryImageId, onPrimaryChanged]);

  // Handle delete image from group
  const handleDeleteImage = useCallback(async (image: CogImage, index: number, e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't allow deleting the only image in group
    if (groupImages.length <= 1) {
      setError('Cannot delete the only image in group');
      return;
    }

    // Confirm deletion
    if (!confirm(`Delete this image? This cannot be undone.`)) {
      return;
    }

    setActionInProgress(image.id);

    try {
      await deleteImageWithCleanup(image.id);

      // Determine which image to show next
      // If we deleted the current image, show the previous or next in group
      let newActiveImage: CogImage | null = null;
      if (image.id === imageId) {
        // Prefer previous image, or next if we deleted the first
        newActiveImage = index > 0 ? groupImages[index - 1] : groupImages[index + 1] || null;
      }

      // Update local state
      setGroupImages(prev => prev.filter(img => img.id !== image.id));

      // Notify parent
      onImageDeleted?.(image.id, newActiveImage);
    } catch (err) {
      console.error('Failed to delete image:', err);
      setError('Failed to delete image');
    } finally {
      setActionInProgress(null);
    }
  }, [groupImages, imageId, onImageDeleted]);

  if (!isExpanded) return null;

  // Find current image index in group
  const currentIndex = groupImages.findIndex((img) => img.id === imageId);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-black/90 border-t border-white/20 p-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white text-sm font-medium">
          Group
          {groupImages.length > 0 && (
            <span className="ml-2 text-white/50">
              ({currentIndex + 1} of {groupImages.length})
            </span>
          )}
        </h3>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-sm"
          aria-label="Close group panel"
        >
          ×
        </button>
      </div>

      {loading && (
        <div className="text-white/50 text-sm py-4 text-center">Loading group...</div>
      )}

      {error && (
        <div className="text-red-400 text-sm py-2">{error}</div>
      )}

      {!loading && !error && groupImages.length === 0 && (
        <div className="text-white/50 text-sm py-4 text-center">No images in group</div>
      )}

      {!loading && !error && groupImages.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {groupImages.map((image, index) => {
            const isCurrent = image.id === imageId;
            const isPrimary = image.id === primaryImageId;
            const isLoading = actionInProgress === image.id;

            return (
              <div key={image.id} className="relative flex-shrink-0 group">
                <button
                  onClick={() => onSelectImage(image)}
                  disabled={isLoading}
                  className={`relative ${
                    isCurrent
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-black'
                      : 'hover:ring-2 hover:ring-white/40 hover:ring-offset-2 hover:ring-offset-black'
                  } ${isLoading ? 'opacity-50' : ''}`}
                >
                  <img
                    src={getCogImageUrl(image.storage_path)}
                    alt={`Image ${index + 1}`}
                    className="w-16 h-16 object-cover rounded"
                  />

                  {/* Hover tooltip with prompt */}
                  {image.prompt && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-black border border-white/20 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <p className="line-clamp-3">{image.prompt}</p>
                    </div>
                  )}
                </button>

                {/* Star toggle for primary (top right) */}
                <button
                  onClick={(e) => handleTogglePrimary(image.id, e)}
                  disabled={isLoading}
                  className={`absolute top-1 right-1 p-0.5 rounded transition-all ${
                    isPrimary
                      ? 'text-yellow-400'
                      : 'text-white/30 hover:text-yellow-400/70 opacity-0 group-hover:opacity-100'
                  }`}
                  aria-label={isPrimary ? 'Remove as primary' : 'Set as primary'}
                  title={isPrimary ? 'Primary (click to clear)' : 'Set as primary'}
                >
                  <svg
                    className="w-4 h-4"
                    fill={isPrimary ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>

                {/* Delete button (bottom right, visible on hover) */}
                {groupImages.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteImage(image, index, e)}
                    disabled={isLoading}
                    className="absolute bottom-1 right-1 p-0.5 rounded text-white/30 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={`Delete image`}
                    title="Delete image"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="mt-2 text-xs text-white/40">
        <kbd className="px-1 py-0.5 bg-white/10 rounded">g</kbd> toggle panel
      </div>
    </div>
  );
}

// Legacy alias for backwards compatibility
export { GroupPanel as VersionHistoryPanel };
