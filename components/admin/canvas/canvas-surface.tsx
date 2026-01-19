'use client'

import { ReactNode, useRef, useState, useCallback } from 'react'

interface CanvasSurfaceProps {
  children: ReactNode
  showGrid?: boolean
  onBackgroundClick?: () => void
}

/**
 * Scrollable/pannable container for canvas content.
 * Provides grid background and handles pan interactions.
 * Pan/zoom can be added later; starts with scrollable container.
 */
export function CanvasSurface({
  children,
  showGrid = true,
  onBackgroundClick,
}: CanvasSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only trigger if clicking directly on the surface, not children
      if (e.target === containerRef.current && onBackgroundClick) {
        onBackgroundClick()
      }
    },
    [onBackgroundClick]
  )

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className={`
        flex-1 min-w-0 h-full overflow-auto
        ${showGrid ? 'canvas-grid-bg' : 'bg-muted/20'}
      `}
      style={showGrid ? {
        backgroundImage: `
          linear-gradient(to right, hsl(var(--border) / 0.3) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border) / 0.3) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
      } : undefined}
    >
      {children}
    </div>
  )
}
