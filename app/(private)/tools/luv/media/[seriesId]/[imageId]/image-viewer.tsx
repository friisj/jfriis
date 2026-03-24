'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getCogImageUrl } from '@/lib/cog/images';
import { IconArrowLeft, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import type { CogImage } from '@/lib/types/cog';

interface LuvImageViewerProps {
  seriesId: string;
  imageId: string;
  images: CogImage[];
  seriesTitle: string;
}

export function LuvImageViewer({ seriesId, imageId, images, seriesTitle }: LuvImageViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = images.findIndex((img) => img.id === imageId);
    return idx >= 0 ? idx : 0;
  });

  // Zoom state
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const [zoomIndicatorValue, setZoomIndicatorValue] = useState(100);
  const zoomIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transformInstanceRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    resetTransform: (ms?: number) => void;
    instance: { transformState: { scale: number } };
  } | null>(null);

  const currentImage = images[currentIndex];

  const exitToGrid = useCallback(() => {
    router.push(`/tools/luv/media/${seriesId}`);
  }, [router, seriesId]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      window.history.replaceState(
        null,
        '',
        `/tools/luv/media/${seriesId}/${images[newIndex].id}`,
      );
    }
  }, [currentIndex, images, seriesId]);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      window.history.replaceState(
        null,
        '',
        `/tools/luv/media/${seriesId}/${images[newIndex].id}`,
      );
    }
  }, [currentIndex, images, seriesId]);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/');
      const urlImageId = pathParts[pathParts.length - 1];
      if (urlImageId) {
        const idx = images.findIndex((img) => img.id === urlImageId);
        if (idx !== -1) setCurrentIndex(idx);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [images]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'Escape':
          exitToGrid();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case '0':
          e.preventDefault();
          transformInstanceRef.current?.resetTransform(300);
          break;
        case '-':
        case '_':
          e.preventDefault();
          transformInstanceRef.current?.zoomOut();
          break;
        case '=':
        case '+':
          e.preventDefault();
          transformInstanceRef.current?.zoomIn();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitToGrid, goToPrevious, goToNext]);

  // Preload adjacent images
  useEffect(() => {
    if (!currentImage) return;

    const links: HTMLLinkElement[] = [];
    const PRELOAD_RADIUS = 2;

    for (let offset = 1; offset <= PRELOAD_RADIUS; offset++) {
      for (const idx of [currentIndex + offset, currentIndex - offset]) {
        if (idx >= 0 && idx < images.length) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = getCogImageUrl(images[idx].storage_path);
          if (offset === 1) link.setAttribute('fetchpriority', 'high');
          document.head.appendChild(link);
          links.push(link);
        }
      }
    }

    return () => links.forEach((link) => link.remove());
  }, [currentIndex, currentImage, images]);

  if (!currentImage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={exitToGrid}
            className="text-white/70 hover:text-white transition-colors"
            aria-label="Back to grid"
          >
            <IconArrowLeft size={18} />
          </button>
          <span className="text-xs text-white/50">{seriesTitle}</span>
        </div>
        <span className="text-xs text-white/50 font-mono">
          {currentIndex + 1} / {images.length}
        </span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden relative">
        <TransformWrapper
          key={currentImage.id}
          initialScale={1}
          minScale={0.1}
          maxScale={8}
          centerOnInit
          wheel={{ step: 0.05, smoothStep: 0.002 }}
          doubleClick={{ mode: 'reset', animationTime: 300 }}
          panning={{ velocityDisabled: false, excluded: ['button', 'a'] }}
          velocityAnimation={{ sensitivity: 1, animationTime: 400 }}
          alignmentAnimation={{ animationTime: 300 }}
          onInit={(ref) => setZoomIndicatorValue(Math.round(ref.state.scale * 100))}
          onZoom={(ref) => {
            setZoomIndicatorValue(Math.round(ref.state.scale * 100));
            setShowZoomIndicator(true);
            if (zoomIndicatorTimeoutRef.current) clearTimeout(zoomIndicatorTimeoutRef.current);
            zoomIndicatorTimeoutRef.current = setTimeout(() => setShowZoomIndicator(false), 1000);
          }}
        >
          {({ zoomIn, zoomOut, resetTransform, instance }) => {
            transformInstanceRef.current = { zoomIn, zoomOut, resetTransform, instance };

            return (
              <>
                {/* Zoom indicator */}
                {showZoomIndicator && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                    <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2">
                      <div className="text-2xl font-mono font-semibold text-white">
                        {zoomIndicatorValue}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Zoom controls */}
                <div className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-lg px-2 py-2 font-mono text-xs">
                  <button
                    onClick={() => zoomOut()}
                    disabled={instance.transformState.scale <= 0.1}
                    className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
                    title="Zoom out (-)"
                  >
                    −
                  </button>
                  <button
                    onClick={() => resetTransform(300)}
                    className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded min-w-[52px] transition-colors"
                    title="Reset zoom (0)"
                  >
                    {zoomIndicatorValue}%
                  </button>
                  <button
                    onClick={() => zoomIn()}
                    disabled={instance.transformState.scale >= 8}
                    className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 transition-colors"
                    title="Zoom in (+)"
                  >
                    +
                  </button>
                </div>

                {/* Nav arrows */}
                {currentIndex > 0 && (
                  <button
                    onClick={goToPrevious}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                    aria-label="Previous image"
                  >
                    <IconChevronLeft size={24} />
                  </button>
                )}

                {/* Image */}
                <TransformComponent
                  wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
                  contentStyle={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCogImageUrl(currentImage.storage_path)}
                    alt={currentImage.filename ?? ''}
                    className="max-w-[90vw] max-h-[calc(100vh-48px)] object-contain select-none"
                    draggable={false}
                    fetchPriority="high"
                    decoding="async"
                  />
                </TransformComponent>

                {currentIndex < images.length - 1 && (
                  <button
                    onClick={goToNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
                    aria-label="Next image"
                  >
                    <IconChevronRight size={24} />
                  </button>
                )}
              </>
            );
          }}
        </TransformWrapper>
      </div>
    </div>
  );
}
