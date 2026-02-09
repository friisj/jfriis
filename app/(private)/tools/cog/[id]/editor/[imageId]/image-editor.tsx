'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { getCogImageUrl } from '@/lib/cog'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'
import { setPrimaryImage, removeFromGroup, deleteImage } from '@/lib/ai/actions/manage-group'

interface ImageEditorProps {
  seriesId: string
  imageId: string
}

export function ImageEditor({ seriesId, imageId }: ImageEditorProps) {
  const router = useRouter()
  const [images, setImages] = useState<CogImageWithGroupInfo[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showGroupMode, setShowGroupMode] = useState(false)
  const [groupImages, setGroupImages] = useState<CogImageWithGroupInfo[]>([])
  const [loadingGroup, setLoadingGroup] = useState(false)

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

  // Fetch group images when current image changes
  useEffect(() => {
    async function loadGroupImages() {
      if (!currentImage?.group_id) {
        setGroupImages([])
        return
      }

      setLoadingGroup(true)
      try {
        const response = await fetch(`/api/cog/groups/${currentImage.group_id}/images`)
        const data = await response.json()
        setGroupImages(data)
      } catch (error) {
        console.error('Failed to load group images:', error)
      } finally {
        setLoadingGroup(false)
      }
    }

    loadGroupImages()
  }, [currentImage?.group_id])

  const hasGroup = groupImages.length > 1

  // Navigation
  const exitToGrid = useCallback(() => {
    router.push(`/tools/cog/${seriesId}`)
  }, [router, seriesId])
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

  // Group management actions
  const handleSetPrimary = useCallback(async (imageId: string) => {
    const result = await setPrimaryImage(imageId)
    if (result.success) {
      // Reload group images to reflect change
      if (currentImage?.group_id) {
        const response = await fetch(`/api/cog/groups/${currentImage.group_id}/images`)
        const data = await response.json()
        setGroupImages(data)
      }
    } else {
      alert(`Failed to set primary: ${result.error}`)
    }
  }, [currentImage?.group_id])

  const handleRemoveFromGroup = useCallback(async (imageId: string) => {
    if (!confirm('Remove this image from the group?')) return

    const result = await removeFromGroup(imageId)
    if (result.success) {
      // Reload group images
      if (currentImage?.group_id) {
        const response = await fetch(`/api/cog/groups/${currentImage.group_id}/images`)
        const data = await response.json()
        setGroupImages(data)

        // If we removed the current image, exit group mode
        if (imageId === currentImage.id) {
          setShowGroupMode(false)
        }
      }
    } else {
      alert(`Failed to remove from group: ${result.error}`)
    }
  }, [currentImage?.group_id, currentImage?.id])

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!confirm('Permanently delete this image? This cannot be undone.')) return

    const result = await deleteImage(imageId)
    if (result.success) {
      // If we deleted the current image, navigate away
      if (imageId === currentImage.id) {
        // Try to go to next image, or previous, or back to grid
        if (currentIndex < images.length - 1) {
          goToNext()
        } else if (currentIndex > 0) {
          goToPrevious()
        } else {
          exitToGrid()
        }
      } else {
        // Reload group images
        if (currentImage?.group_id) {
          const response = await fetch(`/api/cog/groups/${currentImage.group_id}/images`)
          const data = await response.json()
          setGroupImages(data)
        }
      }
    } else {
      alert(`Failed to delete image: ${result.error}`)
    }
  }, [currentImage?.group_id, currentImage?.id, currentIndex, images.length, goToNext, goToPrevious, exitToGrid])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Escape':
          if (showGroupMode) {
            setShowGroupMode(false)
          } else {
            exitToGrid()
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case 'g':
        case 'G':
          if (hasGroup) {
            setShowGroupMode((prev) => !prev)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exitToGrid, goToPrevious, goToNext, hasGroup, showGroupMode])

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
          {showGroupMode ? (
            <span className="text-sm font-medium">
              {currentImage.title || currentImage.filename} (Group)
            </span>
          ) : (
            <span className="text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasGroup && !showGroupMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGroupMode(true)}
              className="text-white hover:bg-white/10"
            >
              Group
            </Button>
          )}
          {showGroupMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGroupMode(false)}
              className="text-white hover:bg-white/10"
            >
              Close Group
            </Button>
          )}
          {!showGroupMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={exitToGrid}
              className="text-white hover:bg-white/10"
            >
              Close
            </Button>
          )}
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

      {/* Group Drawer - Overlays bottom when active */}
      {showGroupMode && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/90 backdrop-blur-md border-t border-white/10">
          <div className="px-4 py-4">
            {loadingGroup ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-white/40">Loading group...</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-white/60 font-medium">
                  {groupImages.length} images in group
                </div>

                {/* Horizontal thumbnail scroll */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <div className="flex gap-3 pb-2">
                    {groupImages.map((img) => {
                      const isCurrent = img.id === currentImage.id
                      const isPrimary = img.id === img.group_id

                      return (
                        <div
                          key={img.id}
                          className={`relative flex-shrink-0 rounded-lg overflow-hidden ${
                            isCurrent
                              ? 'ring-2 ring-white'
                              : isPrimary
                              ? 'ring-2 ring-blue-500'
                              : 'ring-1 ring-white/10'
                          }`}
                        >
                          {/* Thumbnail */}
                          <button
                            onClick={() => {
                              const index = images.findIndex((i) => i.id === img.id)
                              if (index !== -1) {
                                router.push(`/tools/cog/${seriesId}/editor/${img.id}`)
                              }
                            }}
                            className="block w-32 h-32 bg-white/5"
                          >
                            <img
                              src={getCogImageUrl(img.storage_path)}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                            />
                          </button>

                          {/* Primary badge */}
                          {isPrimary && (
                            <div className="absolute top-1 left-1 px-2 py-0.5 bg-blue-500 rounded-md text-[10px] font-semibold text-white shadow-lg flex items-center gap-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              Primary
                            </div>
                          )}

                          {/* Controls */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 space-y-1">
                            {!isPrimary && (
                              <button
                                onClick={() => handleSetPrimary(img.id)}
                                className="w-full px-2 py-1 text-[10px] font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
                              >
                                Set Primary
                              </button>
                            )}

                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRemoveFromGroup(img.id)}
                                className="flex-1 px-2 py-1 text-[10px] font-medium text-white/70 bg-white/5 hover:bg-white/10 rounded transition-colors"
                              >
                                Remove
                              </button>

                              <button
                                onClick={() => handleDeleteImage(img.id)}
                                className="flex-1 px-2 py-1 text-[10px] font-medium text-red-400/70 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer - Keyboard hints */}
      <footer className="px-4 py-2 border-t border-white/10">
        <div className="text-xs text-white/40 text-center">
          ←→ navigate · +/- zoom · double-click reset{hasGroup ? ' · g group' : ''} · esc close
        </div>
      </footer>
    </div>
  )
}
