/**
 * Survey Completion Component
 *
 * Displays streaming progress as artifacts are generated from survey responses.
 * Uses useSurveyProcessor hook for real-time updates.
 */

'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSurveyProcessor } from '@/lib/ai/hooks/useSurveyProcessor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'

interface SurveyCompletionProps {
  surveyId: string
  projectSlug: string
}

interface ProgressItemProps {
  done: boolean
  isProcessing?: boolean
  children: React.ReactNode
}

function ProgressItem({ done, isProcessing, children }: ProgressItemProps) {
  return (
    <div className="flex items-center gap-3 py-2">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
      ) : isProcessing ? (
        <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      )}
      <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{children}</span>
    </div>
  )
}

export function SurveyCompletion({ surveyId, projectSlug }: SurveyCompletionProps) {
  const {
    isProcessing,
    error,
    hasProjectUpdates,
    hasHypotheses,
    hasCustomerProfiles,
    hasAssumptions,
    hasExperiments,
    getCount,
    startProcessing,
  } = useSurveyProcessor({
    surveyId,
  })

  // Auto-start processing on mount
  useEffect(() => {
    startProcessing()
  }, [])

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Processing Failed</CardTitle>
          </div>
          <CardDescription>We encountered an error while generating your artifacts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <div className="flex gap-2">
            <Button onClick={() => startProcessing()}>Try Again</Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/studio/${projectSlug}`}>Go to Project</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isComplete = !isProcessing && (hasProjectUpdates || hasHypotheses)

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isComplete ? 'Survey Complete!' : 'Processing Survey...'}
        </CardTitle>
        <CardDescription>
          {isComplete
            ? 'Your strategic artifacts have been generated.'
            : 'Generating strategic artifacts from your responses.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 mb-6">
          <ProgressItem done={hasProjectUpdates} isProcessing={isProcessing && !hasProjectUpdates}>
            Populating project fields
          </ProgressItem>
          <ProgressItem done={hasHypotheses} isProcessing={isProcessing && hasProjectUpdates && !hasHypotheses}>
            Generating hypotheses ({getCount('hypotheses')})
          </ProgressItem>
          <ProgressItem done={hasCustomerProfiles} isProcessing={isProcessing && hasHypotheses && !hasCustomerProfiles}>
            Creating customer profile ({getCount('customer_profiles')})
          </ProgressItem>
          <ProgressItem done={hasAssumptions} isProcessing={isProcessing && hasCustomerProfiles && !hasAssumptions}>
            Identifying assumptions ({getCount('assumptions')})
          </ProgressItem>
          <ProgressItem done={hasExperiments} isProcessing={isProcessing && hasAssumptions && !hasExperiments}>
            Designing experiments ({getCount('experiments')})
          </ProgressItem>
        </div>

        {isProcessing && (
          <p className="text-sm text-muted-foreground mb-4">
            This typically takes 1-2 minutes. You can leave this page and the processing will continue.
          </p>
        )}

        {isComplete && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/admin/studio/${projectSlug}`}>View Project</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
