/**
 * Survey Processing API Route
 *
 * POST /api/surveys/[surveyId]/process
 * Streams artifact generation from completed survey responses in real-time.
 *
 * Security:
 * - Requires authentication
 * - Validates survey ownership
 *
 * Uses Vercel AI SDK's streamObject for real-time artifact generation.
 */

import { streamObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase-server'
import { getModel } from '@/lib/ai/models'
import { SURVEY_PROMPTS } from '@/lib/ai/prompts/surveys'
import { ProcessSurveyOutputSchema } from '@/lib/ai/actions/process-survey'
import type { ProcessSurveyOutput } from '@/lib/ai/actions/process-survey'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'

// Ensure actions are registered
import '@/lib/ai/actions/generate-survey'
import '@/lib/ai/actions/process-survey'

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params
  const supabase = await createClient()

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 2. Fetch survey with responses and verify ownership
  const { data: survey, error: surveyError } = await supabase
    .from('studio_surveys')
    .select(
      `
      *,
      project:studio_projects!inner(*),
      responses:studio_survey_responses(*)
    `
    )
    .eq('id', surveyId)
    .eq('project.user_id', user.id)
    .single()

  if (surveyError || !survey) {
    return new Response('Survey not found', { status: 404 })
  }

  // 3. Mark processing started
  await supabase
    .from('studio_surveys')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      processing_status: 'processing',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', surveyId)

  // 4. Prepare responses for LLM
  const formattedResponses = survey.responses.map((r: any) => {
    const question = survey.questions.questions.find((q: any) => q.id === r.question_id)
    return {
      question_id: r.question_id,
      question_text: question?.question || '',
      response_text: r.response_text,
      response_value: r.response_value,
    }
  })

  // 5. Stream artifact generation
  const modelConfig = getModel('claude-sonnet')

  try {
    const result = await streamObject({
      model: anthropic(modelConfig.modelId),
      schema: ProcessSurveyOutputSchema,
      system: SURVEY_PROMPTS.processing.system,
      prompt: SURVEY_PROMPTS.processing.userTemplate({
        survey_id: surveyId,
        project_id: survey.project_id,
        responses: formattedResponses,
      }),
      onFinish: async ({ object }) => {
        // 6. Persist artifacts after streaming completes
        if (!object) {
          console.error('[survey:process] No object returned from stream')
          return
        }

        try {
          await persistSurveyArtifacts(supabase, surveyId, survey.project_id, object)

          // 7. Mark processing complete
          await supabase
            .from('studio_surveys')
            .update({
              processing_status: 'completed',
              processing_completed_at: new Date().toISOString(),
            })
            .eq('id', surveyId)

          // 8. Update project
          await supabase
            .from('studio_projects')
            .update({
              ...object.project_updates,
              has_pending_survey: false,
              survey_generated_at: new Date().toISOString(),
            })
            .eq('id', survey.project_id)
        } catch (error) {
          console.error('[survey:process] Failed to persist artifacts:', error)
          await supabase
            .from('studio_surveys')
            .update({
              processing_status: 'failed',
              processing_error: error instanceof Error ? error.message : 'Unknown error',
            })
            .eq('id', surveyId)
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[survey:process] Streaming failed:', error)

    // Mark processing failed
    await supabase
      .from('studio_surveys')
      .update({
        processing_status: 'failed',
        processing_error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', surveyId)

    return new Response('Processing failed', { status: 500 })
  }
}

/**
 * Persist generated artifacts to database
 */
async function persistSurveyArtifacts(
  supabase: SupabaseClient,
  surveyId: string,
  projectId: string,
  artifacts: ProcessSurveyOutput
) {
  const artifactRecords: any[] = []

  // Create hypotheses (batch insert)
  if (artifacts.hypotheses.length > 0) {
    const { data: hypotheses } = await supabase
      .from('studio_hypotheses')
      .insert(
        artifacts.hypotheses.map((h) => ({
          project_id: projectId,
          statement: h.statement,
          rationale: h.rationale,
          validation_criteria: h.validation_criteria,
          status: 'proposed',
        }))
      )
      .select()

    hypotheses?.forEach((h, i) => {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'hypothesis',
        artifact_id: h.id,
        source_questions: artifacts.hypotheses[i].source_questions,
        confidence_score: artifacts.hypotheses[i].confidence,
      })
    })
  }

  // Create customer profile
  if (artifacts.customer_profiles.length > 0) {
    const profile = artifacts.customer_profiles[0]
    const { data } = await supabase
      .from('customer_profiles')
      .insert({
        studio_project_id: projectId,
        name: profile.name,
        profile_type: profile.type,
        jobs: profile.jobs,
        pains: profile.pains,
        gains: profile.gains,
      })
      .select()
      .single()

    if (data) {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'customer_profile',
        artifact_id: data.id,
        source_questions: profile.source_questions,
        confidence_score: profile.confidence,
      })
    }
  }

  // Create assumptions (batch insert)
  if (artifacts.assumptions.length > 0) {
    const { data: assumptions } = await supabase
      .from('assumptions')
      .insert(
        artifacts.assumptions.map((a) => ({
          studio_project_id: projectId,
          statement: a.statement,
          category: a.category,
          importance: a.importance,
          evidence_level: 'none',
          status: 'identified',
          is_leap_of_faith: a.is_leap_of_faith,
        }))
      )
      .select()

    assumptions?.forEach((a, i) => {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'assumption',
        artifact_id: a.id,
        source_questions: artifacts.assumptions[i].source_questions,
        confidence_score: artifacts.assumptions[i].confidence,
      })
    })
  }

  // Create experiments (batch insert)
  if (artifacts.experiments.length > 0) {
    const { data: experiments } = await supabase
      .from('studio_experiments')
      .insert(
        artifacts.experiments.map((e) => ({
          project_id: projectId,
          name: e.name,
          description: e.description,
          type: e.type,
          expected_outcome: e.expected_outcome,
          status: 'planned',
        }))
      )
      .select()

    experiments?.forEach((e, i) => {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'experiment',
        artifact_id: e.id,
        source_questions: artifacts.experiments[i].source_questions,
        confidence_score: artifacts.experiments[i].confidence,
      })
    })
  }

  // Record project field updates
  for (const [field, value] of Object.entries(artifacts.project_updates)) {
    if (value) {
      artifactRecords.push({
        survey_id: surveyId,
        artifact_type: 'project_field',
        artifact_field: field,
        source_questions: [],
      })
    }
  }

  // Save artifact records
  if (artifactRecords.length > 0) {
    await supabase.from('studio_survey_artifacts').insert(artifactRecords)
  }
}
