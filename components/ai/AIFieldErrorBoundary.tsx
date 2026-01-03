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
      // Return custom fallback if provided
      if (this.props.fallback !== undefined) {
        return this.props.fallback
      }

      // Default fallback: gracefully degrade (no AI controls)
      // Don't render children - they caused the error
      // In development, show a subtle warning indicator
      if (process.env.NODE_ENV === 'development') {
        return (
          <span className="text-xs text-amber-600 dark:text-amber-400" title={this.state.error?.message}>
            ⚠
          </span>
        )
      }

      // In production, silently degrade
      return null
    }

    return this.props.children
  }
}
