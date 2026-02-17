'use client'

import { useState, useCallback } from 'react'
import { refineCogImageStandalone } from '@/lib/ai/actions/refine-cog-image-standalone'
import type { CogImageWithGroupInfo } from '@/lib/types/cog'

export type RefinementModel = 'gemini-3-pro' | 'flux-2-pro' | 'flux-2-dev'
export type ImageSize = '1K' | '2K' | '4K'
export type AspectRatio = '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '2:3'

interface UseRefineModeParams {
  currentImage: CogImageWithGroupInfo | undefined
  refreshImages: () => Promise<CogImageWithGroupInfo[]>
  onComplete: () => void
}

export function useRefineMode({ currentImage, refreshImages, onComplete }: UseRefineModeParams) {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState<RefinementModel>('gemini-3-pro')
  const [imageSize, setImageSize] = useState<ImageSize>('2K')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [isRefining, setIsRefining] = useState(false)

  const canSubmit = !!prompt.trim() && !isRefining

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !currentImage) return

    setIsRefining(true)
    try {
      const result = await refineCogImageStandalone({
        imageId: currentImage.id,
        feedback: prompt.trim(),
        model,
        imageSize,
        aspectRatio,
      })

      if (result.success) {
        onComplete()
        setPrompt('')
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
  }, [prompt, model, imageSize, aspectRatio, currentImage, refreshImages, onComplete])

  const handleClear = useCallback(() => {
    setPrompt('')
  }, [])

  const reset = useCallback(() => {
    setPrompt('')
    setIsRefining(false)
  }, [])

  return {
    prompt,
    setPrompt,
    model,
    setModel,
    imageSize,
    setImageSize,
    aspectRatio,
    setAspectRatio,
    isRefining,
    canSubmit,
    handleGenerate,
    handleClear,
    reset,
  }
}
