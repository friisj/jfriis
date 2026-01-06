/**
 * Survey Completion Component
 *
 * Displays streaming progress as artifacts are generated from survey responses.
 * Shows artifact review panel after processing completes.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSurveyProcessor } from '@/lib/ai/hooks/useSurveyProcessor'
import {
  getSurveyArtifacts,
  deleteSurveyArtifact,
  updateSurveyArtifact,
} from '@/app/actions/surveys'
import { ArtifactReviewPanel } from './artifact-review-panel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'

interface SurveyCompletionProps {
  surveyId: string
  projectSlug: string
  projectId: string
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

// Types for artifacts
interface Hypothesis {
  id: string
  statement: string
  rationale?: string | null
  validation_criteria?: string | null
  status: string
}

interface Assumption {
  id: string
  statement: string
  category: string
  importance: string
  is_leap_of_faith: boolean
  status: string
}

interface Experiment {
  id: string
  name: string
  description: string | null
  type: string | null
  expected_outcome?: string | null
  status: string
}

interface CustomerProfile {
  id: string
  name: string
  profile_type: string | null
  jobs?: string | null
  pains?: string | null
  gains?: string | null
}

export function SurveyCompletion({ surveyId, projectSlug, projectId }: SurveyCompletionProps) {
  const router = useRouter()
  const [showReview, setShowReview] = useState(false)
  const [artifacts, setArtifacts] = useState<{
    hypotheses: Hypothesis[]
    assumptions: Assumption[]
    experiments: Experiment[]
    customerProfiles: CustomerProfile[]
  } | null>(null)
  const [loadingArtifacts, setLoadingArtifacts] = useState(false)

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

  const isComplete = !isProcessing && (hasProjectUpdates || hasHypotheses)

  // Fetch artifacts when processing completes
  useEffect(() => {
    if (isComplete && !artifacts && !loadingArtifacts) {
      setLoadingArtifacts(true)
      getSurveyArtifacts(projectId).then((result) => {
        if (result.success && result.data) {
          setArtifacts({
            hypotheses: result.data.hypotheses as Hypothesis[],
            assumptions: result.data.assumptions as Assumption[],
            experiments: result.data.experiments as Experiment[],
            customerProfiles: result.data.customerProfiles as CustomerProfile[],
          })
        }
        setLoadingArtifacts(false)
      })
    }
  }, [isComplete, artifacts, loadingArtifacts, projectId])

  // Handle deleting an artifact
  const handleDeleteArtifact = useCallback(
    async (type: string, id: string) => {
      const result = await deleteSurveyArtifact(type, id)
      if (result.success && artifacts) {
        // Update local state
        setArtifacts((prev) => {
          if (!prev) return prev
          switch (type) {
            case 'hypothesis':
              return { ...prev, hypotheses: prev.hypotheses.filter((h) => h.id !== id) }
            case 'assumption':
              return { ...prev, assumptions: prev.assumptions.filter((a) => a.id !== id) }
            case 'experiment':
              return { ...prev, experiments: prev.experiments.filter((e) => e.id !== id) }
            case 'customer_profile':
              return { ...prev, customerProfiles: prev.customerProfiles.filter((p) => p.id !== id) }
            default:
              return prev
          }
        })
      }
    },
    [artifacts]
  )

  // Handle updating an artifact
  const handleUpdateArtifact = useCallback(
    async (type: string, id: string, data: Record<string, unknown>) => {
      const result = await updateSurveyArtifact(type, id, data)
      if (result.success && artifacts) {
        // Refresh artifacts from server
        const refreshResult = await getSurveyArtifacts(projectId)
        if (refreshResult.success && refreshResult.data) {
          setArtifacts({
            hypotheses: refreshResult.data.hypotheses as Hypothesis[],
            assumptions: refreshResult.data.assumptions as Assumption[],
            experiments: refreshResult.data.experiments as Experiment[],
            customerProfiles: refreshResult.data.customerProfiles as CustomerProfile[],
          })
        }
      }
    },
    [artifacts, projectId]
  )

  // Handle accepting selected artifacts (navigate to project after acceptance)
  const handleAcceptSelected = useCallback(async () => {
    // All selected artifacts are already in the database; unselected ones were deleted
    // Just navigate to the project
    router.push(`/admin/studio/${projectSlug}/edit`)
  }, [router, projectSlug])

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>Processing Failed</CardTitle>
          </div>
          <CardDescription>
            We encountered an error while generating your artifacts.
          </CardDescription>
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

  // Show artifact review after completion
  if (isComplete && showReview && artifacts) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <ArtifactReviewPanel
          hypotheses={artifacts.hypotheses.map((h) => ({
            ...h,
            rationale: h.rationale || undefined,
            validation_criteria: h.validation_criteria || undefined,
          }))}
          assumptions={artifacts.assumptions}
          experiments={artifacts.experiments.map((e) => ({
            ...e,
            description: e.description || '',
            type: e.type || 'experiment',
            expected_outcome: e.expected_outcome || undefined,
          }))}
          customerProfiles={artifacts.customerProfiles.map((p) => ({
            ...p,
            profile_type: p.profile_type || 'persona',
            jobs: p.jobs || undefined,
            pains: p.pains || undefined,
            gains: p.gains || undefined,
          }))}
          onAcceptSelected={handleAcceptSelected}
          onDeleteArtifact={handleDeleteArtifact}
          onUpdateArtifact={handleUpdateArtifact}
        />
      </div>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{isComplete ? 'Survey Complete!' : 'Processing Survey...'}</CardTitle>
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
          <ProgressItem
            done={hasHypotheses}
            isProcessing={isProcessing && hasProjectUpdates && !hasHypotheses}
          >
            Generating hypotheses ({getCount('hypotheses')})
          </ProgressItem>
          <ProgressItem
            done={hasCustomerProfiles}
            isProcessing={isProcessing && hasHypotheses && !hasCustomerProfiles}
          >
            Creating customer profile ({getCount('customer_profiles')})
          </ProgressItem>
          <ProgressItem
            done={hasAssumptions}
            isProcessing={isProcessing && hasCustomerProfiles && !hasAssumptions}
          >
            Identifying assumptions ({getCount('assumptions')})
          </ProgressItem>
          <ProgressItem
            done={hasExperiments}
            isProcessing={isProcessing && hasAssumptions && !hasExperiments}
          >
            Designing experiments ({getCount('experiments')})
          </ProgressItem>
        </div>

        {isProcessing && (
          <p className="text-sm text-muted-foreground mb-4">
            This typically takes 1-2 minutes. You can leave this page and the processing will
            continue.
          </p>
        )}

        {isComplete && (
          <div className="flex gap-2">
            <Button onClick={() => setShowReview(true)}>Review Artifacts</Button>
            <Button variant="outline" asChild>
              <Link href={`/admin/studio/${projectSlug}/edit`}>Skip to Project</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
