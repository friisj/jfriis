'use client'

import { useState, useRef, useCallback } from 'react'
import type { MorphCanvasRef } from '../../../morph-canvas'
import { morphCogImage } from '@/lib/ai/actions/morph-cog-image'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'

export type MorphTool = 'bloat' | 'pucker'

interface UseMorphModeParams {
  currentImage: CogImageWithGroupInfo | undefined
  refreshImages: () => Promise<CogImageWithGroupInfo[]>
  onComplete: () => void
}

export function useMorphMode({ currentImage, refreshImages, onComplete }: UseMorphModeParams) {
  const canvasRef = useRef<MorphCanvasRef>(null)
  const [tool, setTool] = useState<MorphTool>('bloat')
  const [strength, setStrength] = useState(50)
  const [radius, setRadius] = useState(100)
  const [hasMorphed, setHasMorphed] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const canSubmit = hasMorphed && !isSaving

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || !currentImage) return

    setIsSaving(true)
    try {
      const dataURL = canvasRef.current.getResultDataURL()
      if (!dataURL) {
        alert('No morphed image to save')
        return
      }

      const result = await morphCogImage({
        originalImageId: currentImage.id,
        morphedImageDataURL: dataURL,
      })

      if (result.success) {
        onComplete()
        setHasMorphed(false)
        await refreshImages()
        alert('Morphed image saved!')
      } else {
        alert(`Failed to save: ${result.error}`)
      }
    } catch (error) {
      console.error('Save morph error:', error)
      alert('Failed to save morphed image')
    } finally {
      setIsSaving(false)
    }
  }, [currentImage, refreshImages, onComplete])

  const handleClear = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clearMorph()
      setHasMorphed(false)
    }
  }, [])

  return {
    canvasRef,
    tool,
    setTool,
    strength,
    setStrength,
    radius,
    setRadius,
    hasMorphed,
    setHasMorphed,
    isSaving,
    canSubmit,
    handleSave,
    handleClear,
  }
}
