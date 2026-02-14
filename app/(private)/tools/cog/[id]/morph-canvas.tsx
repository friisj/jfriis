'use client'

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

type MorphTool = 'bloat' | 'pucker'

interface MorphCanvasProps {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  tool: MorphTool
  strength: number
  radius: number
  onMorphApplied: () => void
}

export interface MorphCanvasRef {
  getResultDataURL: () => string | null
  clearMorph: () => void
}

export const MorphCanvas = forwardRef<MorphCanvasRef, MorphCanvasProps>(
  ({ imageUrl, imageWidth, imageHeight, tool, strength, radius, onMorphApplied }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const displayCanvasRef = useRef<HTMLCanvasElement>(null)
    const glfxCanvasRef = useRef<any>(null)
    const textureRef = useRef<any>(null)
    const [isLoaded, setIsLoaded] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

    // Actual image dimensions (detected from loaded image, not DB props which may be wrong)
    const [actualWidth, setActualWidth] = useState<number>(imageWidth)
    const [actualHeight, setActualHeight] = useState<number>(imageHeight)

    // Display scale: fit image to viewport
    const [displayScale, setDisplayScale] = useState(1)

    const computeScale = useCallback((w: number, h: number) => {
      const availableWidth = typeof window !== 'undefined' ? window.innerWidth - 40 : 800
      const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 140 : 600
      const scaleX = availableWidth / w
      const scaleY = availableHeight / h
      return Math.min(scaleX, scaleY, 1)
    }, [])

    // Update scale on window resize
    useEffect(() => {
      if (!actualWidth || !actualHeight) return
      const update = () => setDisplayScale(computeScale(actualWidth, actualHeight))
      update()
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }, [computeScale, actualWidth, actualHeight])

    // Initialize glfx canvas
    useEffect(() => {
      let mounted = true

      const init = async () => {
        try {
          // Dynamically import glfx
          const glfxModule = await import('glfx')
          const canvas = glfxModule.canvas()

          if (!mounted) return

          // Load image
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = imageUrl

          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
          })

          if (!mounted) return

          // Use actual loaded image dimensions (DB values may be wrong/missing)
          const w = img.naturalWidth
          const h = img.naturalHeight
          setActualWidth(w)
          setActualHeight(h)

          // Compute scale immediately to avoid flash at wrong size
          setDisplayScale(computeScale(w, h))

          const texture = canvas.texture(img)
          glfxCanvasRef.current = canvas
          textureRef.current = texture

          // Draw initial image
          canvas.draw(texture).update()

          // Set display canvas buffer to actual dimensions, then copy
          if (displayCanvasRef.current) {
            displayCanvasRef.current.width = w
            displayCanvasRef.current.height = h
            const ctx = displayCanvasRef.current.getContext('2d')
            if (ctx) {
              ctx.drawImage(canvas, 0, 0)
            }
          }

          setIsLoaded(true)
        } catch (error) {
          console.error('Failed to initialize morph canvas:', error)
        }
      }

      init()

      return () => {
        mounted = false
      }
    }, [imageUrl, computeScale])

    // Handle mouse move to show cursor
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!displayCanvasRef.current || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      setCursorPos({
        x: e.clientX - containerRect.left,
        y: e.clientY - containerRect.top,
      })
    }

    const handleMouseLeave = () => {
      setCursorPos(null)
    }

    // Handle click to apply morph
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!glfxCanvasRef.current || !textureRef.current || isApplying || !displayCanvasRef.current) return

      setIsApplying(true)

      const rect = displayCanvasRef.current.getBoundingClientRect()
      const scaleX = actualWidth / rect.width
      const scaleY = actualHeight / rect.height

      const x = (e.clientX - rect.left) * scaleX
      const y = (e.clientY - rect.top) * scaleY

      try {
        const canvas = glfxCanvasRef.current
        const texture = textureRef.current

        // Apply bulge/pinch effect
        const morphStrength = tool === 'bloat' ? strength : -strength

        canvas
          .draw(texture)
          .bulgePinch(x, y, radius, morphStrength / 100) // Normalize strength
          .update()

        // Update texture with the result
        textureRef.current = canvas.texture(canvas)

        // Copy to display canvas
        const ctx = displayCanvasRef.current.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, actualWidth, actualHeight)
          ctx.drawImage(canvas, 0, 0)
        }

        onMorphApplied()
      } catch (error) {
        console.error('Failed to apply morph:', error)
      } finally {
        setIsApplying(false)
      }
    }

    useImperativeHandle(ref, () => ({
      getResultDataURL: () => {
        return displayCanvasRef.current?.toDataURL('image/png') || null
      },
      clearMorph: () => {
        if (!glfxCanvasRef.current || !isLoaded) return

        try {
          // Reload original image
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.src = imageUrl

          img.onload = () => {
            if (glfxCanvasRef.current) {
              const canvas = glfxCanvasRef.current
              const texture = canvas.texture(img)
              textureRef.current = texture
              canvas.draw(texture).update()

              if (displayCanvasRef.current) {
                const ctx = displayCanvasRef.current.getContext('2d')
                if (ctx) {
                  ctx.clearRect(0, 0, displayCanvasRef.current.width, displayCanvasRef.current.height)
                  ctx.drawImage(canvas, 0, 0)
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to clear morph:', error)
        }
      },
    }))

    // Display dimensions
    const displayWidth = actualWidth * displayScale
    const displayHeight = actualHeight * displayScale

    // Calculate cursor radius in screen space
    const cursorRadius = radius * displayScale

    return (
      <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <canvas
          ref={displayCanvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="cursor-none"
          style={{ width: displayWidth, height: displayHeight }}
        />

        {/* Cursor overlay */}
        {cursorPos && !isApplying && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white/60"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: cursorRadius * 2,
              height: cursorRadius * 2,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
            }}
          />
        )}

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        )}
      </div>
    )
  }
)

MorphCanvas.displayName = 'MorphCanvas'
