'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { Button } from '@/components/ui/button'
import { getCogImageUrl, getCogThumbnailUrl, setImageStarRating } from '@/lib/cog'
import { CogDrawerImage } from '@/components/cog/cog-image'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'
import { setPrimaryImage, removeFromGroup, deleteImage } from '@/lib/ai/actions/manage-group'
import { StarRating } from '../../star-rating'
import { MorphCanvas } from '../../morph-canvas'
import { MaskCanvas } from '../../mask-canvas'
import { useMorphMode } from './modes/use-morph-mode'
import { useMaskEditMode } from './modes/use-mask-edit-mode'
import { useRefineMode } from './modes/use-refine-mode'
import { MorphPalette } from './modes/morph-palette'
import { MaskEditPalette } from './modes/mask-edit-palette'
import { RefinePalette } from './modes/refine-palette'

interface ImageEditorProps {
  seriesId: string
  imageId: string
  initialImages: CogImageWithGroupInfo[]
}

type EditMode = 'morph' | 'refine' | 'spot_removal' | 'guided_edit'

export function ImageEditor({ seriesId, imageId, initialImages }: ImageEditorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [images, setImages] = useState<CogImageWithGroupInfo[]>(initialImages)
  const [currentIndex, setCurrentIndex] = useState(() => {
    const index = initialImages.findIndex((img) => img.id === imageId)
    return index >= 0 ? index : 0
  })
  const [showGroupMode, setShowGroupMode] = useState(searchParams.get('group') === 'true')
  const [groupImages, setGroupImages] = useState<CogImageWithGroupInfo[]>([])
  const [loadingGroup, setLoadingGroup] = useState(false)
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)

  // Edit mode state
  const [editMode, setEditMode] = useState<EditMode | null>(null)
  const showEditMode = editMode !== null

  // Zoom state
  const [showZoomIndicator, setShowZoomIndicator] = useState(false)
  const [zoomIndicatorValue, setZoomIndicatorValue] = useState(100)
  const zoomIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const transformInstanceRef = useRef<any>(null)

  // Star rating state (optimistic override)
  const [starRatingOverride, setStarRatingOverride] = useState<number | null>(null)

  // Sync showGroupMode with URL query params
  useEffect(() => {
    setShowGroupMode(searchParams.get('group') === 'true')
  }, [searchParams])

  useEffect(() => {
    setImages(initialImages)
    const index = initialImages.findIndex((img) => img.id === imageId)
    if (index >= 0) {
      setCurrentIndex(index)
    } else if (initialImages.length > 0) {
      router.replace(`/tools/cog/${seriesId}/editor/${initialImages[0].id}`)
    }
  }, [initialImages, imageId, router, seriesId])

  const refreshImages = useCallback(async () => {
    try {
      const response = await fetch(`/api/cog/series/${seriesId}/images`)
      if (!response.ok) {
        console.error('[ImageEditor] Failed to refresh images:', response.statusText)
        return images
      }
      const data = await response.json()
      setImages(data)
      return data as CogImageWithGroupInfo[]
    } catch (error) {
      console.error('[ImageEditor] Failed to refresh images:', error)
      return images
    }
  }, [seriesId, images])

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathParts = window.location.pathname.split('/')
      const urlImageId = pathParts[pathParts.length - 1]

      if (urlImageId && images.length > 0) {
        const index = images.findIndex(img => img.id === urlImageId)
        if (index !== -1) {
          setCurrentIndex(index)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [images])

  const currentImage = images[currentIndex]

  // Get the displayed image (group image when in group mode, series image otherwise)
  const displayedImage = showGroupMode && groupImages.length > 0
    ? groupImages[currentGroupIndex]
    : currentImage

  // Mode hooks
  const exitEdit = useCallback(() => setEditMode(null), [])

  const morph = useMorphMode({ currentImage, refreshImages, onComplete: exitEdit })
  const maskEdit = useMaskEditMode({ currentImage, refreshImages, onComplete: exitEdit })
  const refine = useRefineMode({ currentImage, refreshImages, onComplete: exitEdit })

  const isProcessing = morph.isSaving || maskEdit.isSaving || refine.isRefining

  // Star rating: computed value and handler
  const currentStarRating = starRatingOverride ?? displayedImage?.star_rating ?? 0

  const handleSetStarRating = useCallback((rating: number) => {
    if (!displayedImage) return
    const clamped = Math.max(0, Math.min(5, Math.round(rating)))
    setStarRatingOverride(clamped)

    setImageStarRating(displayedImage.id, clamped).catch((error) => {
      console.error('Failed to set star rating:', error)
      setStarRatingOverride(null)
    })
  }, [displayedImage])

  // Reset star rating override when image changes
  useEffect(() => {
    setStarRatingOverride(null)
  }, [displayedImage?.id])

  // Fetch group images when current image changes
  useEffect(() => {
    if (!currentImage?.group_id) {
      setGroupImages([])
      setCurrentGroupIndex(0)
      return
    }

    const controller = new AbortController()

    async function loadGroupImages() {
      setLoadingGroup(true)
      try {
        const response = await fetch(
          `/api/cog/groups/${currentImage!.group_id}/images`,
          { signal: controller.signal },
        )
        const data = await response.json()

        if (controller.signal.aborted) return

        if (Array.isArray(data)) {
          setGroupImages(data)
          const index = data.findIndex((img: CogImageWithGroupInfo) => img.id === currentImage!.id)
          setCurrentGroupIndex(index >= 0 ? index : 0)
        } else {
          console.error('Group images API returned non-array:', data)
          setGroupImages([])
        }
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Failed to load group images:', error)
        setGroupImages([])
      } finally {
        if (!controller.signal.aborted) {
          setLoadingGroup(false)
        }
      }
    }

    loadGroupImages()

    return () => controller.abort()
  }, [currentImage?.group_id, currentImage?.id])

  const hasGroup = groupImages.length > 1

  // Navigation
  const exitToGrid = useCallback(() => {
    router.push(`/tools/cog/${seriesId}`)
  }, [router, seriesId])

  const goToPrevious = useCallback(() => {
    if (showGroupMode) {
      if (currentGroupIndex > 0) {
        setCurrentGroupIndex(currentGroupIndex - 1)
      }
    } else {
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1
        const prevImage = images[newIndex]
        setCurrentIndex(newIndex)
        window.history.replaceState(
          null,
          '',
          `/tools/cog/${seriesId}/editor/${prevImage.id}${showGroupMode ? '?group=true' : ''}`
        )
      }
    }
  }, [showGroupMode, currentGroupIndex, currentIndex, images, seriesId])

  const goToNext = useCallback(() => {
    if (showGroupMode) {
      if (currentGroupIndex < groupImages.length - 1) {
        setCurrentGroupIndex(currentGroupIndex + 1)
      }
    } else {
      if (currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1
        const nextImage = images[newIndex]
        setCurrentIndex(newIndex)
        window.history.replaceState(
          null,
          '',
          `/tools/cog/${seriesId}/editor/${nextImage.id}${showGroupMode ? '?group=true' : ''}`
        )
      }
    }
  }, [showGroupMode, currentGroupIndex, groupImages.length, currentIndex, images, seriesId])

  // Group management actions
  const handleSetPrimary = useCallback(async (imageId: string) => {
    const result = await setPrimaryImage(imageId)
    if (result.success) {
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
      if (currentImage?.group_id) {
        const response = await fetch(`/api/cog/groups/${currentImage.group_id}/images`)
        const data = await response.json()
        setGroupImages(data)

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
      if (imageId === currentImage.id) {
        if (currentIndex < images.length - 1) {
          goToNext()
        } else if (currentIndex > 0) {
          goToPrevious()
        } else {
          exitToGrid()
        }
      } else {
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

  // Reset edit state when mode changes
  useEffect(() => {
    if (editMode !== 'refine') {
      refine.reset()
    }
    if (editMode !== 'spot_removal' && editMode !== 'guided_edit') {
      maskEdit.reset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  // Reset all edit state when navigating to different image
  useEffect(() => {
    setEditMode(null)
    refine.reset()
    maskEdit.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImage?.id])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'Escape':
          if (showEditMode) {
            setEditMode(null)
          } else if (showGroupMode) {
            setShowGroupMode(false)
          } else {
            exitToGrid()
          }
          break
        case 'ArrowLeft':
          if (!showEditMode) {
            e.preventDefault()
            goToPrevious()
          }
          break
        case 'ArrowRight':
          if (!showEditMode) {
            e.preventDefault()
            goToNext()
          }
          break
        case 'g':
        case 'G':
          if (hasGroup && !showEditMode) {
            if (showGroupMode) {
              router.push(`/tools/cog/${seriesId}/editor/${currentImage.id}`)
            } else {
              router.push(`/tools/cog/${seriesId}/editor/${currentImage.id}?group=true`)
            }
          }
          break
        case 'e':
        case 'E':
          if (!showGroupMode) {
            setEditMode((prev) => (prev ? null : 'morph'))
          }
          break
        case '1': case '2': case '3': case '4': case '5':
          if (!showEditMode) {
            e.preventDefault()
            handleSetStarRating(parseInt(e.key, 10))
          }
          break
        case '0':
          if (!showEditMode && transformInstanceRef.current) {
            e.preventDefault()
            transformInstanceRef.current.resetTransform(300)
          }
          break
        case '-':
        case '_':
          if (!showEditMode && transformInstanceRef.current) {
            e.preventDefault()
            transformInstanceRef.current.zoomOut()
          }
          break
        case '=':
        case '+':
          if (!showEditMode && transformInstanceRef.current) {
            e.preventDefault()
            transformInstanceRef.current.zoomIn()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [exitToGrid, goToPrevious, goToNext, hasGroup, showGroupMode, showEditMode, handleSetStarRating, currentImage, seriesId, router])

  // Preload adjacent images for faster navigation
  useEffect(() => {
    if (!currentImage) return

    const preloadImage = (url: string, priority: 'high' | 'low' = 'low') => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = url
      if (priority === 'high') {
        link.setAttribute('fetchpriority', 'high')
      }
      document.head.appendChild(link)
      return link
    }

    const links: HTMLLinkElement[] = []
    const currentIdx = images.findIndex((img) => img.id === currentImage.id)

    if (showGroupMode && groupImages.length > 0) {
      groupImages.forEach((img) => {
        if (img.id !== displayedImage.id) {
          links.push(preloadImage(getCogImageUrl(img.storage_path)))
        }
      })
    } else {
      const PRELOAD_RADIUS = 3

      for (let offset = 1; offset <= PRELOAD_RADIUS; offset++) {
        const nextIdx = currentIdx + offset
        if (nextIdx < images.length) {
          const nextImage = images[nextIdx]
          const priority = offset === 1 ? 'high' : 'low'

          if (nextImage.thumbnail_256) {
            links.push(preloadImage(
              getCogThumbnailUrl(nextImage.storage_path, nextImage.thumbnail_256, 256),
              priority
            ))
          }
          links.push(preloadImage(getCogImageUrl(nextImage.storage_path), priority))
        }

        const prevIdx = currentIdx - offset
        if (prevIdx >= 0) {
          const prevImage = images[prevIdx]
          const priority = offset === 1 ? 'high' : 'low'

          if (prevImage.thumbnail_256) {
            links.push(preloadImage(
              getCogThumbnailUrl(prevImage.storage_path, prevImage.thumbnail_256, 256),
              priority
            ))
          }
          links.push(preloadImage(getCogImageUrl(prevImage.storage_path), priority))
        }
      }
    }

    return () => {
      links.forEach((link) => link.remove())
    }
  }, [currentImage, displayedImage, images, showGroupMode, groupImages])

  if (!currentImage) {
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
        {/* Left: Counter or title */}
        <div className="flex items-center gap-3 text-white min-w-[120px]">
          {showGroupMode ? (
            <span className="text-sm font-medium">
              {currentImage.title || currentImage.filename} (Group)
            </span>
          ) : (
            <span className="text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          <StarRating
            rating={currentStarRating}
            onChange={handleSetStarRating}
            size="md"
          />
        </div>

        {/* Center: Edit Mode Selector */}
        {showEditMode && (
          <div className="flex items-center gap-1">
            {(['morph', 'refine', 'spot_removal', 'guided_edit'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setEditMode(mode)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  editMode === mode
                    ? 'bg-white text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {mode === 'morph' ? 'Morph' : mode === 'refine' ? 'Refine' : mode === 'spot_removal' ? 'Spot Removal' : 'Guided Edit'}
              </button>
            ))}
          </div>
        )}

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 min-w-[120px] justify-end">
          {showEditMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditMode(null)}
              className="text-white hover:bg-white/10"
            >
              Close Edit
            </Button>
          )}
          {!showEditMode && hasGroup && !showGroupMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/tools/cog/${seriesId}/editor/${currentImage.id}?group=true`)}
              className="text-white hover:bg-white/10"
            >
              Group
            </Button>
          )}
          {!showEditMode && showGroupMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/tools/cog/${seriesId}/editor/${currentImage.id}`)}
              className="text-white hover:bg-white/10"
            >
              Close Group
            </Button>
          )}
          {!showEditMode && !showGroupMode && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode('morph')}
                className="text-white hover:bg-white/10"
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitToGrid}
                className="text-white hover:bg-white/10"
              >
                Close
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Canvas Viewport */}
      <div className="flex-1 relative overflow-hidden">
        {editMode === 'morph' ? (
          <MorphCanvas
            ref={morph.canvasRef}
            imageUrl={getCogImageUrl(displayedImage.storage_path)}
            imageWidth={displayedImage.width || 1024}
            imageHeight={displayedImage.height || 1024}
            tool={morph.tool}
            strength={morph.strength}
            radius={morph.radius}
            onMorphApplied={() => morph.setHasMorphed(true)}
          />
        ) : editMode === 'spot_removal' || editMode === 'guided_edit' ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <MaskCanvas
              ref={maskEdit.canvasRef}
              imageUrl={getCogImageUrl(displayedImage.storage_path)}
              imageWidth={displayedImage.width || 1024}
              imageHeight={displayedImage.height || 1024}
              onMaskChange={maskEdit.setMaskBase64}
              hideToolbar={true}
              tool={maskEdit.brushTool}
              brushSize={maskEdit.brushSize}
              maskOpacity={maskEdit.maskOpacity}
              maxHeight="calc(100vh - 120px)"
            />
          </div>
        ) : (
          <TransformWrapper
            key={currentImage.id}
            initialScale={1}
            minScale={0.1}
            maxScale={8}
            centerOnInit
            wheel={{
              step: 0.05,
              smoothStep: 0.002,
            }}
            doubleClick={{
              mode: 'reset',
              animationTime: 300,
            }}
            panning={{
              velocityDisabled: false,
              excluded: ['button', 'a'],
            }}
            velocityAnimation={{
              sensitivity: 1,
              animationTime: 400,
            }}
            alignmentAnimation={{
              animationTime: 300,
            }}
            onInit={(ref) => {
              setZoomIndicatorValue(Math.round(ref.state.scale * 100))
            }}
            onZoom={(ref) => {
              setZoomIndicatorValue(Math.round(ref.state.scale * 100))
              setShowZoomIndicator(true)

              if (zoomIndicatorTimeoutRef.current) {
                clearTimeout(zoomIndicatorTimeoutRef.current)
              }
              zoomIndicatorTimeoutRef.current = setTimeout(() => {
                setShowZoomIndicator(false)
              }, 1000)
            }}
          >
            {({ zoomIn, zoomOut, resetTransform, instance }) => {
              transformInstanceRef.current = { zoomIn, zoomOut, resetTransform, instance }

              return (
              <>
                {/* Transient zoom indicator - center screen */}
                {showZoomIndicator && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                    <div className="bg-black/90 backdrop-blur-md border border-white/20 rounded-lg px-4 py-2 shadow-2xl">
                      <div className="text-2xl font-mono font-semibold text-white">
                        {zoomIndicatorValue}%
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Zoom Controls - Bottom right (hidden in edit mode) */}
                {!showEditMode && (
                  <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                    <div className="flex items-center gap-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-lg px-1.5 py-1.5 font-mono text-xs">
                      <button
                        onClick={() => resetTransform(300)}
                        className="px-2 py-0.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Fit to screen (0)"
                      >
                        Fit
                      </button>
                    </div>

                    <div className="flex items-center gap-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-lg px-2 py-2 font-mono text-xs">
                      <button
                        onClick={() => zoomOut()}
                        disabled={instance.transformState.scale <= 0.1}
                        className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Zoom out (-)"
                        aria-label="Zoom out (minus key)"
                      >
                        −
                      </button>
                      <button
                        onClick={() => resetTransform(300)}
                        className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded min-w-[52px] transition-colors"
                        title="Reset zoom (0)"
                        aria-label="Reset zoom to fit (0 key)"
                      >
                        {zoomIndicatorValue}%
                      </button>
                      <button
                        onClick={() => zoomIn()}
                        disabled={instance.transformState.scale >= 8}
                        className="px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Zoom in (=)"
                        aria-label="Zoom in (plus key)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Previous Button - Hidden in edit mode */}
                {!showEditMode && currentIndex > 0 && (
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
                  wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing"
                  contentStyle={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={getCogImageUrl(displayedImage.storage_path)}
                    alt={displayedImage.filename}
                    className="max-w-[90vw] max-h-[90vh] object-contain select-none"
                    draggable={false}
                    style={{ maxWidth: '90vw', maxHeight: '90vh' }}
                    fetchPriority="high"
                    decoding="async"
                  />
                </TransformComponent>

                {/* Next Button - Hidden in edit mode */}
                {!showEditMode && currentIndex < images.length - 1 && (
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
            )}}
          </TransformWrapper>
        )}
      </div>

      {/* Floating Palettes for Edit Modes */}
      {editMode === 'morph' && <MorphPalette morph={morph} />}
      {(editMode === 'spot_removal' || editMode === 'guided_edit') && (
        <MaskEditPalette maskEdit={maskEdit} mode={editMode} />
      )}
      {editMode === 'refine' && <RefinePalette refine={refine} />}

      {/* Group Drawer - Overlays bottom when active */}
      {showGroupMode && (
        <div className="absolute bottom-0 inset-x-0 z-20 bg-black/50 backdrop-blur-">
          <div className="px-4 py-4">
            {loadingGroup ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-sm text-white/40">Loading group...</div>
              </div>
            ) : (
              <div>
                {/* Horizontal thumbnail scroll */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <div className="flex gap-3 pb-2">
                    {groupImages.map((img, index) => {
                      const isCurrent = index === currentGroupIndex
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
                              const index = groupImages.findIndex(g => g.id === img.id)
                              if (index >= 0) {
                                setCurrentGroupIndex(index)
                              }
                            }}
                            className="block w-32 h-32 bg-white/5"
                          >
                            <CogDrawerImage
                              storagePath={img.storage_path}
                              alt={img.filename}
                              thumbnail128={img.thumbnail_128}
                              thumbnail64={img.thumbnail_64}
                              width={128}
                              height={128}
                              className="object-cover"
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

      {/* Loading overlay - shown during any edit generation */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-black/80 px-8 py-6 rounded-lg border border-white/10">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <div className="text-sm font-medium text-white">
              {refine.isRefining && 'Generating refinement...'}
              {maskEdit.isSaving && editMode === 'spot_removal' && 'Removing spots...'}
              {maskEdit.isSaving && editMode === 'guided_edit' && 'Applying guided edit...'}
              {morph.isSaving && 'Saving morph...'}
            </div>
            <div className="text-xs text-white/50">This may take 30-60 seconds</div>
          </div>
        </div>
      )}

      {/* Footer - Keyboard hints */}
      <footer className="px-4 py-2 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-white/40">
          <div className="text-center flex-1">
            {showEditMode ? (
              'esc exit edit mode'
            ) : (
              <>
                ←→ navigate · 1-5 stars · 0 fit · +/- zoom · double-click reset{hasGroup ? ' · g group' : ''} · e edit · esc close
              </>
            )}
          </div>
          {!showEditMode && currentImage && (
            <div className="font-mono text-white/30">
              {currentImage.width}×{currentImage.height}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
