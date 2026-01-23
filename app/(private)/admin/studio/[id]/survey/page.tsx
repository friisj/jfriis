/**
 * Survey Page
 *
 * Displays and handles survey completion for a project.
 * MVP implementation with basic question types (text, textarea, select).
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SurveyPlayer } from './survey-player'
import { SurveyErrorBoundary } from '@/components/admin/survey/survey-error-boundary'

interface SurveyPageProps {
  params: Promise<{ id: string }>
}

export default async function SurveyPage({ params }: SurveyPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get project with pending survey
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .select('id, slug, name, description, temperature, has_pending_survey')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    redirect('/admin/studio')
  }

  // Get pending or in-progress survey
  const { data: survey, error: surveyError } = await supabase
    .from('studio_surveys')
    .select(`
      *,
      responses:studio_survey_responses(*)
    `)
    .eq('project_id', project.id)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (surveyError || !survey) {
    redirect(`/admin/studio/${id}/edit`)
  }

  return (
    <div className="container py-8">
      <SurveyErrorBoundary projectSlug={project.slug}>
        <SurveyPlayer project={project as any} survey={survey as any} />
      </SurveyErrorBoundary>
    </div>
  )
}
