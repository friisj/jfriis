'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCogImageUrl, deleteImage } from '@/lib/cog';
import { Button } from '@/components/ui/button';
import type { CogImage } from '@/lib/types/cog';

interface ImageGalleryProps {
  images: CogImage[];
  seriesId: string;
}

export function ImageGallery({ images: initialImages, seriesId }: ImageGalleryProps) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isOpen = selectedIndex !== null;

  const openImage = (index: number) => {
    setSelectedIndex(index);
    setShowDeleteConfirm(false);
  };

  const closeGallery = () => {
    setSelectedIndex(null);
    setShowDeleteConfirm(false);
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

  const handleDelete = useCallback(async () => {
    if (selectedIndex === null) return;
    const imageToDelete = images[selectedIndex];

    setDeleting(true);
    try {
      await deleteImage(imageToDelete.id);

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
  }, [selectedIndex, images, router]);

  const handleDeleteFromGrid = useCallback(async (imageId: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      await deleteImage(imageId);
      setImages(images.filter((img) => img.id !== imageId));
      router.refresh();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }, [images, router]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys if delete confirm is showing
      if (showDeleteConfirm) {
        if (e.key === 'Escape') {
          setShowDeleteConfirm(false);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          closeGallery();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'k':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'j':
          e.preventDefault();
          goToNext();
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
  }, [isOpen, goToPrevious, goToNext, showDeleteConfirm]);

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

  const currentImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <div className="flex-1">
      {/* Thumbnail Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="group relative border rounded-lg overflow-hidden hover:ring-2 ring-primary transition-all"
          >
            <button
              onClick={() => openImage(index)}
              className="w-full text-left"
            >
              <div className="aspect-square bg-muted relative">
                <img
                  src={getCogImageUrl(image.storage_path)}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2 text-xs">
                <p className="truncate">{image.filename}</p>
                <p className="text-muted-foreground">
                  {image.source === 'generated' ? 'Generated' : 'Uploaded'}
                </p>
              </div>
            </button>
            {/* Delete button on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFromGrid(image.id);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              aria-label="Delete image"
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
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {isOpen && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={closeGallery}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm">
              <span className="font-medium">
                {selectedIndex! + 1} / {images.length}
              </span>
              <span className="ml-4 text-white/60">{currentImage.filename}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40 hidden sm:block">
                j/k to navigate, d to delete, Esc to close
              </span>
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

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div
              className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-black/90 border border-red-500/50 rounded-lg p-4 flex items-center gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white text-sm">Delete this image?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
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
              className="max-h-[calc(100vh-120px)] max-w-full object-contain"
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

          {/* Footer - Image Info */}
          <div
            className="p-4 text-white/60 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {currentImage.prompt && (
              <p className="line-clamp-2 max-w-3xl mx-auto text-center">
                {currentImage.prompt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
