'use client'

import { ReactNode } from 'react'

interface CanvasViewLayoutProps {
  header: ReactNode
  toolbar?: ReactNode
  children: ReactNode
}

/**
 * Full-screen container for canvas views.
 * Provides consistent layout with header slot, optional toolbar, and main canvas area.
 */
export function CanvasViewLayout({
  header,
  toolbar,
  children,
}: CanvasViewLayoutProps) {
  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background">
        {header}
      </div>

      {/* Toolbar (optional) */}
      {toolbar && (
        <div className="flex-shrink-0 border-b bg-muted/30 px-4 py-2">
          {toolbar}
        </div>
      )}

      {/* Canvas Surface */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
