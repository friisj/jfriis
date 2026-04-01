'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import {
  IconX, IconChevronLeft, IconChevronRight,
  IconCopy, IconDownload, IconPaperclip, IconId,
  IconStar, IconStarFilled,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { LightboxImage } from './lightbox-context';
import { setImageStarRating } from '@/lib/cog/images';

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onAttach?: (index: number) => void;
}

export function ImageLightbox({ images, currentIndex, onClose, onNavigate, onAttach }: ImageLightboxProps) {
  const touchRef = useRef<{ startY: number; startX: number } | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [starState, setStarState] = useState<{ index: number; rating: number }>({ index: -1, rating: 0 });
  const [toast, setToast] = useState<string | null>(null);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const current = images[currentIndex];

  // Reset star when image changes (derived, no effect needed)
  const starRating = starState.index === currentIndex ? starState.rating : 0;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  }, []);

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

  // --- Actions ---

  const handleCopy = useCallback(async () => {
    if (!current) return;
    try {
      const res = await fetch(current.url);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      showToast('Copied');
    } catch { showToast('Copy failed'); }
  }, [current, showToast]);

  const handleDownload = useCallback(() => {
    if (!current) return;
    const a = document.createElement('a');
    a.href = current.url;
    a.download = current.cogImageId ? `image-${current.cogImageId}` : 'image';
    a.click();
  }, [current]);

  const handleCopyId = useCallback(() => {
    if (!current?.cogImageId) return;
    navigator.clipboard.writeText(current.cogImageId);
    showToast('ID copied');
  }, [current, showToast]);

  const handleAttach = useCallback(() => {
    if (!current?.index || !onAttach) return;
    onAttach(current.index);
    onClose();
  }, [current, onAttach, onClose]);

  const handleStar = useCallback(async (rating: number) => {
    if (!current?.cogImageId) return;
    const newRating = starRating === rating ? 0 : rating;
    setStarState({ index: currentIndex, rating: newRating });
    try {
      await setImageStarRating(current.cogImageId, newRating);
    } catch { showToast('Rating failed'); }
  }, [current, currentIndex, starRating, showToast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
      else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) handleCopy();
      else if (e.key === 'd' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); handleDownload(); }
      else if (e.key === 'a' && !e.metaKey && !e.ctrlKey) handleAttach();
      else if (e.key >= '1' && e.key <= '5' && !e.metaKey && !e.ctrlKey) handleStar(parseInt(e.key));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext, handleCopy, handleDownload, handleAttach, handleStar]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchRef.current = { startY: e.touches[0].clientY, startX: e.touches[0].clientX };
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const deltaY = e.touches[0].clientY - touchRef.current.startY;
    const deltaX = e.touches[0].clientX - touchRef.current.startX;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
      setSwipeOffset(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchRef.current) return;
    const threshold = 80;
    if (swipeOffset < -threshold && hasNext) goNext();
    else if (swipeOffset > threshold && hasPrev) goPrev();
    setSwipeOffset(0);
    touchRef.current = null;
  }, [swipeOffset, hasNext, hasPrev, goNext, goPrev]);

  if (!images?.length || !current) return null;

  const hasCog = !!current.cogImageId;
  const hasIndex = !!current.index;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center select-none"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close */}
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

      {/* Nav buttons (desktop) */}
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
          'max-w-[90vw] max-h-[75vh] object-contain',
          transitioning && 'transition-opacity duration-200 opacity-80',
        )}
        style={{
          transform: swipeOffset ? `translateY(${swipeOffset * 0.4}px)` : undefined,
          transition: swipeOffset ? 'none' : 'transform 0.2s ease-out',
        }}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Control bar */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1.5 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Star rating */}
        {hasCog && (
          <div className="flex items-center gap-0.5 px-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleStar(n)}
                className="text-white/50 hover:text-amber-400 transition-colors"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                {n <= starRating
                  ? <IconStarFilled size={14} className="text-amber-400" />
                  : <IconStar size={14} />}
              </button>
            ))}
          </div>
        )}

        {(hasCog || hasIndex) && <div className="w-px h-4 bg-white/20 mx-0.5" />}

        {/* Attach [N] */}
        {hasIndex && onAttach && (
          <ControlButton icon={<IconPaperclip size={15} />} label={`[${current.index}]`} onClick={handleAttach} shortcut="A" />
        )}

        {/* Copy to clipboard */}
        <ControlButton icon={<IconCopy size={15} />} label="Copy" onClick={handleCopy} shortcut="C" />

        {/* Download */}
        <ControlButton icon={<IconDownload size={15} />} label="Save" onClick={handleDownload} shortcut="D" />

        {/* Copy Cog ID */}
        {hasCog && (
          <ControlButton icon={<IconId size={15} />} label="ID" onClick={handleCopyId} />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full z-20">
          {toast}
        </div>
      )}
    </div>
  );
}

function ControlButton({ icon, label, onClick, shortcut }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors text-[11px]"
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
