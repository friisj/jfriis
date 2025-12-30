'use client'

/**
 * Error Boundary for AI Field Controls
 *
 * Prevents AI generation errors from crashing the entire form.
 * Falls back to showing the field without AI controls if something breaks.
 */

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AIFieldErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[AIFieldErrorBoundary] Caught error:', error, errorInfo)
    }

    // In production, you might want to log to an error tracking service
    // e.g., Sentry.captureException(error)
  }

  render() {
    if (this.state.hasError) {
      // Return custom fallback or just the children without AI controls
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback: show a subtle warning
      return (
        <div>
          {this.props.children}
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              ⚠ AI controls unavailable ({this.state.error?.message})
            </p>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
