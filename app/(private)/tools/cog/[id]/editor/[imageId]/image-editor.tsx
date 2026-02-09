'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { getCogImageUrl } from '@/lib/cog'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'

interface ImageEditorProps {
  seriesId: string
  imageId: string
}

export function ImageEditor({ seriesId, imageId }: ImageEditorProps) {
  const router = useRouter()
  const [images, setImages] = useState<CogImageWithGroupInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch series images
  useEffect(() => {
    async function loadImages() {
      try {
        const response = await fetch(`/api/cog/series/${seriesId}/images`)
        const data = await response.json()
        setImages(data)

        // Find current image index
        const index = data.findIndex((img: CogImageWithGroupInfo) => img.id === imageId)
        if (index !== -1) {
          setCurrentIndex(index)
        }
      } catch (error) {
        console.error('Failed to load images:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadImages()
  }, [seriesId, imageId])

  const currentImage = images[currentIndex]

  // Navigation
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevImage = images[currentIndex - 1]
      router.push(`/tools/cog/${seriesId}/editor/${prevImage.id}`)
    }
  }, [currentIndex, images, router, seriesId])

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      const nextImage = images[currentIndex + 1]
      router.push(`/tools/cog/${seriesId}/editor/${nextImage.id}`)
    }
  }, [currentIndex, images, router, seriesId])

  const exitToGrid = useCallback(() => {
    router.push(`/tools/cog/${seriesId}`)
  }, [router, seriesId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Escape':
          exitToGrid()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exitToGrid, goToPrevious, goToNext])

  if (isLoading || !currentImage) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3 text-white">
          <span className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={exitToGrid}
            className="text-white hover:bg-white/10"
          >
            Close
          </Button>
        </div>
      </header>

      {/* Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden">
        <TransformWrapper
          key={currentImage.id}
          initialScale={1}
          minScale={0.5}
          maxScale={4}
          centerOnInit
          wheel={{ step: 0.1 }}
          doubleClick={{ mode: 'reset' }}
          panning={{ velocityDisabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform, instance }) => (
            <>
              {/* Zoom Controls - Floating top right */}
              <div className="absolute top-4 right-4 z-10 flex items-center gap-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-lg px-2 py-2 font-mono text-xs">
                <button
                  onClick={() => zoomOut()}
                  disabled={instance.transformState.scale <= 0.5}
                  className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom out"
                >
                  −
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded min-w-[52px] transition-colors"
                  title="Reset zoom (double-click image)"
                >
                  {Math.round(instance.transformState.scale * 100)}%
                </button>
                <button
                  onClick={() => zoomIn()}
                  disabled={instance.transformState.scale >= 4}
                  className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom in"
                >
                  +
                </button>
              </div>

              {/* Previous Button */}
              {currentIndex > 0 && (
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
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
              )}

              {/* Image Canvas */}
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentStyle={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={getCogImageUrl(currentImage.storage_path)}
                  alt={currentImage.filename}
                  className="max-w-[90vw] max-h-[90vh] object-contain"
                  style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                />
              </TransformComponent>

              {/* Next Button */}
              {currentIndex < images.length - 1 && (
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
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
              )}
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Footer - Keyboard hints */}
      <footer className="px-4 py-2 border-t border-white/10">
        <div className="text-xs text-white/40 text-center">
          ←→ navigate · +/- zoom · double-click reset · esc close
        </div>
      </footer>
    </div>
  )
}
