/**
 * Survey Error Boundary
 *
 * Catches React errors in the survey flow and displays a friendly error message.
 * Allows users to retry or navigate away without losing the whole page.
 */

'use client'

import { Component, type ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  projectSlug?: string
  fallbackMessage?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class SurveyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('[SurveyErrorBoundary] Caught error:', error)
    console.error('[SurveyErrorBoundary] Error info:', errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { projectSlug, fallbackMessage } = this.props
      const errorMessage = this.state.error?.message || fallbackMessage || 'Something went wrong'

      return (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle>Survey Error</CardTitle>
            </div>
            <CardDescription>
              An error occurred while loading the survey. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {errorMessage}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={this.handleReset} variant="default">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              {projectSlug && (
                <Button variant="outline" asChild>
                  <Link href={`/admin/studio/${projectSlug}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Project
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link href="/admin/studio">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Studio
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
