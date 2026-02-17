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
import { MorphCanvas, type MorphCanvasRef } from '../../morph-canvas'
import { MaskCanvas, type MaskCanvasRef } from '../../mask-canvas'
import { FloatingPalette } from '../../floating-palette'
import { morphCogImage } from '@/lib/ai/actions/morph-cog-image'
import { refineCogImageStandalone } from '@/lib/ai/actions/refine-cog-image-standalone'
import { touchupCogImage } from '@/lib/ai/actions/touchup-cog-image'

interface ImageEditorProps {
  seriesId: string
  imageId: string
  initialImages: CogImageWithGroupInfo[]
}

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
  type EditMode = 'morph' | 'refine' | 'spot_removal' | 'guided_edit'
  type MorphTool = 'bloat' | 'pucker'
  const [editMode, setEditMode] = useState<EditMode | null>(null)
  const showEditMode = editMode !== null

  // Morph mode state
  const morphCanvasRef = useRef<MorphCanvasRef>(null)
  const [morphTool, setMorphTool] = useState<MorphTool>('bloat')
  const [morphStrength, setMorphStrength] = useState(50)
  const [morphRadius, setMorphRadius] = useState(100)
  const [hasMorphed, setHasMorphed] = useState(false)
  const [isSavingMorph, setIsSavingMorph] = useState(false)

  // Refine mode state
  type RefinementModel = 'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev'
  type ImageSize = '1K' | '2K' | '4K'
  type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:3'
  const [refinePrompt, setRefinePrompt] = useState('')
  const [refineModel, setRefineModel] = useState<RefinementModel>('gemini-3-pro')
  const [refineSize, setRefineSize] = useState<ImageSize>('2K')
  const [refineAspectRatio, setRefineAspectRatio] = useState<AspectRatio>('1:1')
  const [isRefining, setIsRefining] = useState(false)

  // Spot removal mode state
  const spotMaskCanvasRef = useRef<MaskCanvasRef>(null)
  const [spotMaskBase64, setSpotMaskBase64] = useState<string | null>(null)
  const [isSavingSpotRemoval, setIsSavingSpotRemoval] = useState(false)
  type MaskTool = 'brush' | 'eraser'
  const [spotBrushTool, setSpotBrushTool] = useState<MaskTool>('brush')
  const [spotBrushSize, setSpotBrushSize] = useState(30)
  const [spotMaskOpacity, setSpotMaskOpacity] = useState(0.5)

  // Guided edit mode state
  const guidedMaskCanvasRef = useRef<MaskCanvasRef>(null)
  const [guidedMaskBase64, setGuidedMaskBase64] = useState<string | null>(null)
  const [guidedPrompt, setGuidedPrompt] = useState('')
  const [isSavingGuidedEdit, setIsSavingGuidedEdit] = useState(false)
  const [guidedBrushTool, setGuidedBrushTool] = useState<MaskTool>('brush')
  const [guidedBrushSize, setGuidedBrushSize] = useState(30)
  const [guidedMaskOpacity, setGuidedMaskOpacity] = useState(0.5)

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
      // imageId not in list (e.g. wrong group filter) — navigate to first image
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
      // When user uses browser back/forward, sync currentIndex with URL
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

        // Ensure data is an array before using it
        if (Array.isArray(data)) {
          setGroupImages(data)

          // Find the index of the current image in the group
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

  // Morph handlers
  const handleSaveMorph = useCallback(async () => {
    if (!morphCanvasRef.current || !currentImage) return

    setIsSavingMorph(true)
    try {
      const dataURL = morphCanvasRef.current.getResultDataURL()
      if (!dataURL) {
        alert('No morphed image to save')
        return
      }

      const result = await morphCogImage({
        originalImageId: currentImage.id,
        morphedImageDataURL: dataURL,
      })

      if (result.success) {
        // Exit edit mode and reload images
        setEditMode(null)
        setHasMorphed(false)
        // Reload the series images to include the new morphed image
        await refreshImages()
        alert('Morphed image saved!')
      } else {
        alert(`Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Save morph error:', error)
      alert('Failed to save morphed image')
    } finally {
      setIsSavingMorph(false)
    }
  }, [currentImage, refreshImages, seriesId])

  const handleClearMorph = useCallback(() => {
    if (morphCanvasRef.current) {
      morphCanvasRef.current.clearMorph()
      setHasMorphed(false)
    }
  }, [])

  // Refine handler
  const handleRefineGenerate = useCallback(async () => {
    if (!refinePrompt.trim() || !currentImage) return

    setIsRefining(true)
    try {
      const result = await refineCogImageStandalone({
        imageId: currentImage.id,
        feedback: refinePrompt.trim(),
        model: refineModel,
        imageSize: refineSize,
        aspectRatio: refineAspectRatio,
      })

      if (result.success) {
        setEditMode(null)
        setRefinePrompt('')

        await refreshImages()

        alert('Refined image generated successfully!')
      } else {
        alert(`Failed to refine: ${result.error}`)
      }
    } catch (error) {
      console.error('Refine error:', error)
      alert('Failed to generate refinement')
    } finally {
      setIsRefining(false)
    }
  }, [refinePrompt, refineModel, refineSize, refineAspectRatio, currentImage, refreshImages, seriesId])

  // Spot removal handler
  const handleSpotRemoval = useCallback(async () => {
    if (!spotMaskBase64 || !currentImage) return

    setIsSavingSpotRemoval(true)
    try {
      const result = await touchupCogImage({
        imageId: currentImage.id,
        maskBase64: spotMaskBase64,
        mode: 'spot_removal',
      })

      if (result.success) {
        setEditMode(null)
        setSpotMaskBase64(null)
        spotMaskCanvasRef.current?.clearMask()

        await refreshImages()

        alert('Spot removal complete!')
      } else {
        alert(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Spot removal error:', error)
      alert('Failed to remove spots')
    } finally {
      setIsSavingSpotRemoval(false)
    }
  }, [spotMaskBase64, currentImage, refreshImages, seriesId])

  // Guided edit handler
  const handleGuidedEdit = useCallback(async () => {
    if (!guidedMaskBase64 || !guidedPrompt.trim() || !currentImage) return

    setIsSavingGuidedEdit(true)
    try {
      const result = await touchupCogImage({
        imageId: currentImage.id,
        maskBase64: guidedMaskBase64,
        prompt: guidedPrompt.trim(),
        mode: 'guided_edit',
      })

      if (result.success) {
        setEditMode(null)
        setGuidedMaskBase64(null)
        setGuidedPrompt('')
        guidedMaskCanvasRef.current?.clearMask()

        await refreshImages()

        alert('Guided edit complete!')
      } else {
        alert(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Guided edit error:', error)
      alert('Failed to apply edit')
    } finally {
      setIsSavingGuidedEdit(false)
    }
  }, [guidedMaskBase64, guidedPrompt, currentImage, refreshImages, seriesId])

  // Navigation
  const exitToGrid = useCallback(() => {
    router.push(`/tools/cog/${seriesId}`)
  }, [router, seriesId])

  // Navigate within current scope (group or series)
  const goToPrevious = useCallback(() => {
    if (showGroupMode) {
      // Navigate within group (use local state, no page reload)
      if (currentGroupIndex > 0) {
        setCurrentGroupIndex(currentGroupIndex - 1)
      }
    } else {
      // Navigate within series (use local state + URL update, no page reload)
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1
        const prevImage = images[newIndex]
        setCurrentIndex(newIndex)

        // Update URL without triggering navigation
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
      // Navigate within group (use local state, no page reload)
      if (currentGroupIndex < groupImages.length - 1) {
        setCurrentGroupIndex(currentGroupIndex + 1)
      }
    } else {
      // Navigate within series (use local state + URL update, no page reload)
      if (currentIndex < images.length - 1) {
        const newIndex = currentIndex + 1
        const nextImage = images[newIndex]
        setCurrentIndex(newIndex)

        // Update URL without triggering navigation
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

  // Reset edit state when mode changes
  useEffect(() => {
    if (editMode !== 'refine') {
      setRefinePrompt('')
      setIsRefining(false)
    }
    if (editMode !== 'spot_removal') {
      setSpotMaskBase64(null)
      setIsSavingSpotRemoval(false)
    }
    if (editMode !== 'guided_edit') {
      setGuidedMaskBase64(null)
      setGuidedPrompt('')
      setIsSavingGuidedEdit(false)
    }
  }, [editMode])

  // Reset all edit state when navigating to different image
  useEffect(() => {
    setEditMode(null)
    setRefinePrompt('')
    setSpotMaskBase64(null)
    setGuidedMaskBase64(null)
    setGuidedPrompt('')
    setIsRefining(false)
    setIsSavingSpotRemoval(false)
    setIsSavingGuidedEdit(false)
  }, [currentImage?.id])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing
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

    // In group mode, preload ALL group images for instant navigation
    if (showGroupMode && groupImages.length > 0) {
      groupImages.forEach((img) => {
        // Skip the currently displayed image
        if (img.id !== displayedImage.id) {
          links.push(preloadImage(getCogImageUrl(img.storage_path)))
        }
      })
    } else {
      // In series mode, aggressively preload surrounding images
      // Preload 3 images in each direction for smoother navigation
      const PRELOAD_RADIUS = 3

      for (let offset = 1; offset <= PRELOAD_RADIUS; offset++) {
        // Preload next images
        const nextIdx = currentIdx + offset
        if (nextIdx < images.length) {
          const nextImage = images[nextIdx]
          // High priority for immediate neighbors, low for extended radius
          const priority = offset === 1 ? 'high' : 'low'

          // Preload thumbnail first for faster perceived load
          if (nextImage.thumbnail_256) {
            links.push(preloadImage(
              getCogThumbnailUrl(nextImage.storage_path, nextImage.thumbnail_256, 256),
              priority
            ))
          }
          // Then preload full image
          links.push(preloadImage(getCogImageUrl(nextImage.storage_path), priority))
        }

        // Preload previous images
        const prevIdx = currentIdx - offset
        if (prevIdx >= 0) {
          const prevImage = images[prevIdx]
          const priority = offset === 1 ? 'high' : 'low'

          // Preload thumbnail first for faster perceived load
          if (prevImage.thumbnail_256) {
            links.push(preloadImage(
              getCogThumbnailUrl(prevImage.storage_path, prevImage.thumbnail_256, 256),
              priority
            ))
          }
          // Then preload full image
          links.push(preloadImage(getCogImageUrl(prevImage.storage_path), priority))
        }
      }
    }

    // Cleanup preload links when selection changes
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
            <button
              onClick={() => setEditMode('morph')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editMode === 'morph'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Morph
            </button>
            <button
              onClick={() => setEditMode('refine')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editMode === 'refine'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Refine
            </button>
            <button
              onClick={() => setEditMode('spot_removal')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editMode === 'spot_removal'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Spot Removal
            </button>
            <button
              onClick={() => setEditMode('guided_edit')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                editMode === 'guided_edit'
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Guided Edit
            </button>
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
          /* Morph Canvas */
          <MorphCanvas
            ref={morphCanvasRef}
            imageUrl={getCogImageUrl(displayedImage.storage_path)}
            imageWidth={displayedImage.width || 1024}
            imageHeight={displayedImage.height || 1024}
            tool={morphTool}
            strength={morphStrength}
            radius={morphRadius}
            onMorphApplied={() => setHasMorphed(true)}
          />
        ) : editMode === 'spot_removal' || editMode === 'guided_edit' ? (
          /* Mask Canvas (Spot Removal / Guided Edit) - Full viewport */
          <div className="w-full h-full flex items-center justify-center bg-black">
            <MaskCanvas
              ref={editMode === 'spot_removal' ? spotMaskCanvasRef : guidedMaskCanvasRef}
              imageUrl={getCogImageUrl(displayedImage.storage_path)}
              imageWidth={displayedImage.width || 1024}
              imageHeight={displayedImage.height || 1024}
              onMaskChange={(mask) => {
                if (editMode === 'spot_removal') {
                  setSpotMaskBase64(mask)
                } else {
                  setGuidedMaskBase64(mask)
                }
              }}
              hideToolbar={true}
              tool={editMode === 'spot_removal' ? spotBrushTool : guidedBrushTool}
              brushSize={editMode === 'spot_removal' ? spotBrushSize : guidedBrushSize}
              maskOpacity={editMode === 'spot_removal' ? spotMaskOpacity : guidedMaskOpacity}
              maxHeight="calc(100vh - 120px)"
            />
          </div>
        ) : (
          /* View Mode / Refine Mode Canvas with Zoom */
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
              // Store instance methods in ref for keyboard shortcuts
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
                    {/* Preset zoom levels */}
                    <div className="flex items-center gap-0.5 bg-black/75 backdrop-blur-md border border-white/10 rounded-lg px-1.5 py-1.5 font-mono text-xs">
                      <button
                        onClick={() => resetTransform(300)}
                        className="px-2 py-0.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Fit to screen (0)"
                      >
                        Fit
                      </button>
                    </div>

                    {/* Zoom controls */}
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

      {/* Morph Mode Palettes */}
      {editMode === 'morph' && (
        <>
          {/* Tools Palette - Bottom Left */}
          <FloatingPalette id="morph-tools" title="Tools" anchor="bottom-left" className="min-w-[300px]">
            <div className="space-y-3">
              {/* Tool selector */}
              <div>
                <div className="text-xs text-white/60 font-medium mb-2">Tool</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setMorphTool('bloat')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      morphTool === 'bloat'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Bloat
                  </button>
                  <button
                    onClick={() => setMorphTool('pucker')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      morphTool === 'pucker'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    Pucker
                  </button>
                </div>
              </div>

              {/* Strength slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Strength</label>
                  <span className="text-xs text-white/60 font-mono">{morphStrength}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={morphStrength}
                  onChange={(e) => setMorphStrength(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Radius slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Radius</label>
                  <span className="text-xs text-white/60 font-mono">{morphRadius}</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={morphRadius}
                  onChange={(e) => setMorphRadius(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>
            </div>
          </FloatingPalette>

          {/* Actions Palette - Bottom Right */}
          <FloatingPalette id="morph-actions" title="Actions" anchor="bottom-right">
            <div className="space-y-2">
              <button
                onClick={handleClearMorph}
                disabled={!hasMorphed}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={handleSaveMorph}
                disabled={!hasMorphed || isSavingMorph}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSavingMorph ? 'Saving...' : 'Save Morph'}
              </button>
              <div className="text-xs text-white/40 text-center pt-1">
                Click image to apply {morphTool}
              </div>
            </div>
          </FloatingPalette>
        </>
      )}

      {/* Refine Mode Palettes */}
      {editMode === 'refine' && (
        <>
          {/* Prompt Palette - Bottom Center */}
          <FloatingPalette id="refine-prompt" title="Refine" anchor="bottom-center" className="w-[600px] max-w-[90vw]">
            <div className="space-y-3">
              {/* Prompt */}
              <div>
                <label className="text-xs text-white/60 font-medium mb-2 block">
                  Describe Changes
                </label>
                <textarea
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  placeholder="E.g., 'Make the sky more dramatic' or 'Add warmer tones'"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  rows={2}
                  disabled={isRefining}
                />
              </div>

              {/* Model + Size + Aspect */}
              <div className="flex items-center gap-3">
                <select
                  value={refineModel}
                  onChange={(e) => setRefineModel(e.target.value as RefinementModel)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isRefining}
                >
                  <option value="gemini-3-pro">Gemini 3 Pro</option>
                  <option value="flux-2-pro">Flux 2 Pro</option>
                  <option value="flux-2-dev">Flux 2 Dev</option>
                </select>
                <select
                  value={refineSize}
                  onChange={(e) => setRefineSize(e.target.value as ImageSize)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isRefining}
                >
                  <option value="1K">1K</option>
                  <option value="2K">2K</option>
                  <option value="4K">4K</option>
                </select>
                <select
                  value={refineAspectRatio}
                  onChange={(e) => setRefineAspectRatio(e.target.value as AspectRatio)}
                  className="px-3 py-2 bg-white/10 border border-white/20 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isRefining}
                >
                  <option value="1:1">1:1</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="3:2">3:2</option>
                  <option value="9:16">9:16</option>
                  <option value="2:3">2:3</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefineGenerate}
                  disabled={!refinePrompt.trim() || isRefining}
                  className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isRefining ? 'Generating...' : 'Generate Refinement'}
                </button>
                <button
                  onClick={() => setRefinePrompt('')}
                  disabled={!refinePrompt || isRefining}
                  className="px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>
          </FloatingPalette>
        </>
      )}

      {/* Spot Removal Mode Palettes */}
      {editMode === 'spot_removal' && (
        <>
          {/* Brush Palette - Bottom Left */}
          <FloatingPalette id="spot-brush" title="Brush" anchor="bottom-left" className="min-w-[280px]">
            <div className="space-y-3">
              {/* Tool selector */}
              <div>
                <div className="text-xs text-white/60 font-medium mb-2">Tool</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSpotBrushTool('brush')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      spotBrushTool === 'brush'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Brush (B)"
                  >
                    Brush
                  </button>
                  <button
                    onClick={() => setSpotBrushTool('eraser')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      spotBrushTool === 'eraser'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Eraser (E)"
                  >
                    Eraser
                  </button>
                </div>
              </div>

              {/* Brush size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Brush Size</label>
                  <span className="text-xs text-white/60 font-mono">{spotBrushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={spotBrushSize}
                  onChange={(e) => setSpotBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Mask opacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Mask Opacity</label>
                  <span className="text-xs text-white/60 font-mono">{Math.round(spotMaskOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={spotMaskOpacity}
                  onChange={(e) => setSpotMaskOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Keyboard hints */}
              <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                <kbd className="px-1 py-0.5 bg-white/10 rounded">B</kbd> brush · <kbd className="px-1 py-0.5 bg-white/10 rounded">E</kbd> eraser · <kbd className="px-1 py-0.5 bg-white/10 rounded">[</kbd><kbd className="px-1 py-0.5 bg-white/10 rounded">]</kbd> size
              </div>
            </div>
          </FloatingPalette>

          {/* Actions Palette - Bottom Right */}
          <FloatingPalette id="spot-actions" title="Actions" anchor="bottom-right">
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSpotMaskBase64(null)
                  spotMaskCanvasRef.current?.clearMask()
                }}
                disabled={!spotMaskBase64 || isSavingSpotRemoval}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Clear Mask
              </button>
              <button
                onClick={handleSpotRemoval}
                disabled={!spotMaskBase64 || isSavingSpotRemoval}
                className="w-full px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSavingSpotRemoval ? 'Generating...' : 'Generate Removal'}
              </button>
              <div className="text-xs text-white/40 text-center pt-1">
                Takes 15-30 seconds
              </div>
            </div>
          </FloatingPalette>
        </>
      )}

      {/* Guided Edit Mode Palettes */}
      {editMode === 'guided_edit' && (
        <>
          {/* Brush Palette - Bottom Left */}
          <FloatingPalette id="guided-brush" title="Brush" anchor="bottom-left" className="min-w-[280px]">
            <div className="space-y-3">
              {/* Tool selector */}
              <div>
                <div className="text-xs text-white/60 font-medium mb-2">Tool</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setGuidedBrushTool('brush')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      guidedBrushTool === 'brush'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Brush (B)"
                  >
                    Brush
                  </button>
                  <button
                    onClick={() => setGuidedBrushTool('eraser')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
                      guidedBrushTool === 'eraser'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                    title="Eraser (E)"
                  >
                    Eraser
                  </button>
                </div>
              </div>

              {/* Brush size */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Brush Size</label>
                  <span className="text-xs text-white/60 font-mono">{guidedBrushSize}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={guidedBrushSize}
                  onChange={(e) => setGuidedBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Mask opacity */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-white/60 font-medium">Mask Opacity</label>
                  <span className="text-xs text-white/60 font-mono">{Math.round(guidedMaskOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={guidedMaskOpacity}
                  onChange={(e) => setGuidedMaskOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              {/* Keyboard hints */}
              <div className="text-xs text-white/40 pt-2 border-t border-white/10">
                <kbd className="px-1 py-0.5 bg-white/10 rounded">B</kbd> brush · <kbd className="px-1 py-0.5 bg-white/10 rounded">E</kbd> eraser · <kbd className="px-1 py-0.5 bg-white/10 rounded">[</kbd><kbd className="px-1 py-0.5 bg-white/10 rounded">]</kbd> size
              </div>
            </div>
          </FloatingPalette>

          {/* Prompt + Actions Palette - Bottom Right */}
          <FloatingPalette id="guided-prompt" title="Edit" anchor="bottom-right" className="w-[400px]">
            <div className="space-y-3">
              {/* Prompt */}
              <div>
                <label className="text-xs text-white/60 font-medium mb-2 block">
                  Edit Instruction
                </label>
                <input
                  type="text"
                  value={guidedPrompt}
                  onChange={(e) => setGuidedPrompt(e.target.value)}
                  placeholder="E.g., 'Replace with a window'"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={isSavingGuidedEdit}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setGuidedMaskBase64(null)
                    guidedMaskCanvasRef.current?.clearMask()
                  }}
                  disabled={!guidedMaskBase64 || isSavingGuidedEdit}
                  className="px-3 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  onClick={handleGuidedEdit}
                  disabled={!guidedMaskBase64 || !guidedPrompt.trim() || isSavingGuidedEdit}
                  className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {isSavingGuidedEdit ? 'Generating...' : 'Generate Edit'}
                </button>
              </div>
            </div>
          </FloatingPalette>
        </>
      )}


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
                              // Navigate within group using local state (no page reload)
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
      {(isRefining || isSavingSpotRemoval || isSavingGuidedEdit) && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 bg-black/80 px-8 py-6 rounded-lg border border-white/10">
            <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            <div className="text-sm font-medium text-white">
              {isRefining && 'Generating refinement...'}
              {isSavingSpotRemoval && 'Removing spots...'}
              {isSavingGuidedEdit && 'Applying guided edit...'}
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
