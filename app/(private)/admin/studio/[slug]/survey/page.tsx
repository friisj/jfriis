/**
 * Survey Page
 *
 * Displays and handles survey completion for a project.
 * MVP implementation with basic question types (text, textarea, select).
 */

import { redirect } from 'next/navigation'
import { getSurveyForProject } from '@/app/actions/surveys'
import { SurveyPlayer } from './survey-player'

interface SurveyPageProps {
  params: {
    slug: string
  }
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const result = await getSurveyForProject(params.slug)

  if (!result.success || !result.data) {
    redirect(`/admin/studio/${params.slug}`)
  }

  const { project, survey } = result.data

  return (
    <div className="container py-8">
      <SurveyPlayer project={project} survey={survey} />
    </div>
  )
}
