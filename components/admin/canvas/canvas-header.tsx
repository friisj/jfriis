'use client'

import Link from 'next/link'
import { ReactNode } from 'react'
import { IconChevronLeft, IconHandStop, IconList } from '@tabler/icons-react'
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
          <IconChevronLeft size={16} />
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
            <IconHandStop size={16} />
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
            <IconList size={16} />
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
