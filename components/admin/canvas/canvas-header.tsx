'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

export type CanvasMode = 'drag' | 'structured'

interface CanvasHeaderProps {
  title: string
  backHref: string
  mode: CanvasMode
  onModeChange: (mode: CanvasMode) => void
  actions?: ReactNode
}

/**
 * Header component for canvas views.
 * Includes back navigation, title, mode toggle, and action buttons.
 */
export function CanvasHeader({
  title,
  backHref,
  mode,
  onModeChange,
  actions,
}: CanvasHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      {/* Left: Back + Title */}
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Form
        </Link>
        <div className="h-6 w-px bg-border" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      {/* Center: Mode Toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        <button
          onClick={() => onModeChange('drag')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'drag'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            Drag
          </span>
        </button>
        <button
          onClick={() => onModeChange('structured')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'structured'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Structured
          </span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </div>
  )
}
