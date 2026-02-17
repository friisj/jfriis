'use client'

import { useState, useRef, useCallback } from 'react'
import type { MaskCanvasRef, MaskTool } from '../../../mask-canvas'
import { touchupCogImage } from '@/lib/ai/actions/touchup-cog-image'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'

interface UseMaskEditModeParams {
  currentImage: CogImageWithGroupInfo | undefined
  refreshImages: () => Promise<CogImageWithGroupInfo[]>
  onComplete: () => void
}

export function useMaskEditMode({ currentImage, refreshImages, onComplete }: UseMaskEditModeParams) {
  const canvasRef = useRef<MaskCanvasRef>(null)
  const [brushTool, setBrushTool] = useState<MaskTool>('brush')
  const [brushSize, setBrushSize] = useState(30)
  const [maskOpacity, setMaskOpacity] = useState(0.5)
  const [maskBase64, setMaskBase64] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const canSubmitSpot = !!maskBase64 && !isSaving
  const canSubmitGuided = !!maskBase64 && !!prompt.trim() && !isSaving

  const handleSpotRemoval = useCallback(async () => {
    if (!maskBase64 || !currentImage) return

    setIsSaving(true)
    try {
      const result = await touchupCogImage({
        imageId: currentImage.id,
        maskBase64,
        mode: 'spot_removal',
      })

      if (result.success) {
        onComplete()
        setMaskBase64(null)
        canvasRef.current?.clearMask()
        await refreshImages()
        alert('Spot removal complete!')
      } else {
        alert(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Spot removal error:', error)
      alert('Failed to remove spots')
    } finally {
      setIsSaving(false)
    }
  }, [maskBase64, currentImage, refreshImages, onComplete])

  const handleGuidedEdit = useCallback(async () => {
    if (!maskBase64 || !prompt.trim() || !currentImage) return

    setIsSaving(true)
    try {
      const result = await touchupCogImage({
        imageId: currentImage.id,
        maskBase64,
        prompt: prompt.trim(),
        mode: 'guided_edit',
      })

      if (result.success) {
        onComplete()
        setMaskBase64(null)
        setPrompt('')
        canvasRef.current?.clearMask()
        await refreshImages()
        alert('Guided edit complete!')
      } else {
        alert(`Failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Guided edit error:', error)
      alert('Failed to apply edit')
    } finally {
      setIsSaving(false)
    }
  }, [maskBase64, prompt, currentImage, refreshImages, onComplete])

  const handleClearMask = useCallback(() => {
    setMaskBase64(null)
    canvasRef.current?.clearMask()
  }, [])

  const reset = useCallback(() => {
    setMaskBase64(null)
    setPrompt('')
    setIsSaving(false)
  }, [])

  return {
    canvasRef,
    brushTool,
    setBrushTool,
    brushSize,
    setBrushSize,
    maskOpacity,
    setMaskOpacity,
    maskBase64,
    setMaskBase64,
    prompt,
    setPrompt,
    isSaving,
    canSubmitSpot,
    canSubmitGuided,
    handleSpotRemoval,
    handleGuidedEdit,
    handleClearMask,
    reset,
  }
}
