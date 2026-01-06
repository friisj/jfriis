/**
 * New Project with Survey Page
 *
 * Create a new project using AI-generated survey onboarding.
 */

import { SurveyTriggerForm } from '@/components/admin/survey/survey-trigger-form'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NewProjectWithSurveyPage() {
  return (
    <div className="container py-8">
      <div className="max-w-2xl mx-auto mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/studio/new">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Manual Entry
          </Link>
        </Button>
      </div>

      <SurveyTriggerForm />

      <div className="max-w-2xl mx-auto mt-8 p-6 border rounded-lg bg-muted/50">
        <h3 className="font-semibold mb-2">What happens next?</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>We&apos;ll generate a personalized survey (6-10 questions) based on your project</li>
          <li>Answer questions about your problem, customers, solution, and market</li>
          <li>Our AI will analyze your responses and generate:
            <ul className="ml-6 mt-1 space-y-1 list-disc list-inside">
              <li>3-5 testable hypotheses</li>
              <li>A primary customer profile</li>
              <li>5-10 key assumptions to validate</li>
              <li>2-3 initial experiments to run</li>
            </ul>
          </li>
        </ol>
      </div>
    </div>
  )
}
