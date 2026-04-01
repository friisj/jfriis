'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface ImageLightboxProps {
  /** All navigable images */
  images: { url: string; alt?: string }[];
  /** Currently displayed index */
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

/**
 * Fullscreen lightbox with keyboard + swipe navigation.
 *
 * - Left/Right arrows or < > buttons: prev/next image
 * - Vertical swipe (mobile): prev/next image
 * - Escape or backdrop click: close
 */
export function ImageLightbox({ images, currentIndex, onClose, onNavigate }: ImageLightboxProps) {
  const touchRef = useRef<{ startY: number; startX: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const current = images[currentIndex];

  const goPrev = useCallback(() => {
    if (!hasPrev) return;
    setTransitioning(true);
    onNavigate(currentIndex - 1);
    setTimeout(() => setTransitioning(false), 200);
  }, [hasPrev, currentIndex, onNavigate]);

  const goNext = useCallback(() => {
    if (!hasNext) return;
    setTransitioning(true);
    onNavigate(currentIndex + 1);
    setTimeout(() => setTransitioning(false), 200);
  }, [hasNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  // Touch handlers for vertical swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { startY: e.touches[0].clientY, startX: e.touches[0].clientX };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const deltaY = e.touches[0].clientY - touchRef.current.startY;
    const deltaX = e.touches[0].clientX - touchRef.current.startX;
    // Only track if vertical swipe is dominant
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setSwipeOffset(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current) return;
    const threshold = 80;
    if (swipeOffset < -threshold && hasNext) {
      goNext();
    } else if (swipeOffset > threshold && hasPrev) {
      goPrev();
    }
    setSwipeOffset(0);
    touchRef.current = null;
  }, [swipeOffset, hasNext, hasPrev, goNext, goPrev]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center select-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
        aria-label="Close"
      >
        <IconX size={24} />
      </button>

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono z-10">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Prev button (desktop) */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 hidden sm:block"
          aria-label="Previous image"
        >
          <IconChevronLeft size={32} />
        </button>
      )}

      {/* Next button (desktop) */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors z-10 hidden sm:block"
          aria-label="Next image"
        >
          <IconChevronRight size={32} />
        </button>
      )}

      {/* Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={current.alt ?? ''}
        className={cn(
          'max-w-[90vw] max-h-[90vh] object-contain',
          transitioning && 'transition-opacity duration-200 opacity-80',
        )}
        style={{
          transform: swipeOffset ? `translateY(${swipeOffset * 0.4}px)` : undefined,
          transition: swipeOffset ? 'none' : 'transform 0.2s ease-out',
        }}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Swipe hint dots (mobile, when multiple images) */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
          {images.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-colors',
                i === currentIndex ? 'bg-white' : 'bg-white/30',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
