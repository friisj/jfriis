/**
 * Survey Server Actions
 *
 * Server actions for survey generation, response saving, and completion.
 */

'use server'

import { executeAction } from '@/lib/ai/actions'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

interface GenerateProjectSurveyInput {
  name: string
  description?: string
  temperature?: 'hot' | 'warm' | 'cold'
}

interface GenerateProjectSurveyResult {
  success: boolean
  projectSlug?: string
  surveyId?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
}

/**
 * Generate a new project with an AI-generated survey
 */
export async function generateProjectSurvey(
  input: GenerateProjectSurveyInput
): Promise<GenerateProjectSurveyResult> {
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 2. Execute AI action to generate survey
  const result = await executeAction('generate-survey', {
    project_name: input.name,
    project_description: input.description,
    temperature: input.temperature,
  })

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to generate survey',
    }
  }

  // 3. Create project in draft state
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .insert({
      name: input.name,
      description: input.description,
      temperature: input.temperature,
      status: 'draft',
      has_pending_survey: true,
      user_id: user.id,
    })
    .select()
    .single()

  if (projectError) {
    return { success: false, error: projectError.message }
  }

  // 4. Save survey
  const { data: survey, error: surveyError } = await supabase
    .from('studio_surveys')
    .insert({
      project_id: project.id,
      questions: result.data,
      generation_context: input,
      generation_model: result.model,
      status: 'pending',
    })
    .select()
    .single()

  if (surveyError) {
    // Rollback: delete project
    await supabase.from('studio_projects').delete().eq('id', project.id)
    return { success: false, error: surveyError.message }
  }

  revalidatePath('/admin/studio')

  return {
    success: true,
    projectSlug: project.slug,
    surveyId: survey.id,
    usage: result.usage,
  }
}

/**
 * Save a single survey response
 */
export async function saveSurveyResponse(surveyId: string, questionId: string, response: unknown) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Serialize response for text column
  const responseText = typeof response === 'string' ? response : JSON.stringify(response)

  // Upsert response
  const { error } = await supabase
    .from('studio_survey_responses')
    .upsert(
      {
        survey_id: surveyId,
        question_id: questionId,
        response_value: response,
        response_text: responseText,
      },
      {
        onConflict: 'survey_id,question_id',
      }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  // Update survey status to in_progress
  await supabase
    .from('studio_surveys')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', surveyId)
    .eq('status', 'pending') // Only update if still pending

  return { success: true }
}

/**
 * Mark survey as completed (triggers processing)
 */
export async function completeSurvey(surveyId: string) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Mark survey as completed
  const { error: updateError } = await supabase
    .from('studio_surveys')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', surveyId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

/**
 * Get survey with responses for a project
 */
export async function getSurveyForProject(projectSlug: string) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: null }
  }

  // Get project
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .select('id, slug, name, has_pending_survey')
    .eq('slug', projectSlug)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    return { success: false, error: 'Project not found', data: null }
  }

  // Get pending or in-progress survey
  const { data: survey, error: surveyError } = await supabase
    .from('studio_surveys')
    .select(
      `
      *,
      responses:studio_survey_responses(*)
    `
    )
    .eq('project_id', project.id)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (surveyError) {
    return { success: false, error: 'No pending survey found', data: null }
  }

  return {
    success: true,
    data: {
      project,
      survey,
    },
  }
}
