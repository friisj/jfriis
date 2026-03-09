'use client'

import { Component, ReactNode } from 'react'
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react'

interface ViewErrorBoundaryProps {
  children: ReactNode
  viewType?: string
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ViewErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error boundary component for view components
 * Catches and displays errors that occur during rendering
 */
export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  constructor(props: ViewErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('View error:', error, errorInfo)

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      const viewType = this.props.viewType || 'view'

      return (
        <div className="rounded-lg border border-destructive bg-card p-8" role="alert">
          <div className="flex flex-col items-center gap-4 text-center">
            <IconAlertTriangle size={48} className="text-destructive" aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Error loading {viewType}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border hover:bg-accent transition-colors"
            >
              <IconRefresh size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
