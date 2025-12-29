'use client'

/**
 * FieldError Component
 *
 * Displays inline error messages for AI generation failures
 * with retry and dismiss actions.
 */

import { useState, useEffect } from 'react'
import type { ActionError } from '@/lib/ai/actions/types'

interface FieldErrorProps {
  error: ActionError
  onRetry: () => void
  onDismiss: () => void
}

export function FieldError({ error, onRetry, onDismiss }: FieldErrorProps) {
  const [countdown, setCountdown] = useState(error.retryAfter || 0)

  // Handle countdown for rate limits
  useEffect(() => {
    if (!error.retryAfter || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [error.retryAfter, countdown])

  // Auto-dismiss cancelled state
  useEffect(() => {
    if (error.code === 'cancelled') {
      const timer = setTimeout(onDismiss, 3000)
      return () => clearTimeout(timer)
    }
  }, [error.code, onDismiss])

  const canRetry = error.retryable && countdown <= 0

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-destructive/10 border border-destructive/20 text-destructive dark:text-red-400">
      <span className="flex-shrink-0">⚠️</span>
      <span className="flex-grow">{error.message}</span>

      {error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          disabled={!canRetry}
          className={`
            px-2 py-0.5 text-xs font-medium rounded
            ${canRetry
              ? 'bg-destructive/20 hover:bg-destructive/30 cursor-pointer'
              : 'opacity-50 cursor-not-allowed'
            }
          `}
        >
          {countdown > 0 ? `Retry in ${countdown}s` : 'Retry'}
        </button>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
        title="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
