/**
 * Survey Server Actions
 *
 * Server actions for survey generation, response saving, and completion.
 */

'use server'

import { executeAction } from '@/lib/ai/actions'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// Ensure generate-survey action is registered
import '@/lib/ai/actions/generate-survey'

interface GenerateProjectSurveyInput {
  name: string
  description?: string
  temperature?: 'hot' | 'warm' | 'cold'
}

interface GenerateProjectSurveyResult {
  success: boolean
  projectId?: string
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
    project_temperature: input.temperature,
  })

  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || 'Failed to generate survey',
    }
  }

  // 3. Create project in draft state
  // Generate slug from name
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .insert({
      name: input.name,
      slug,
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
    } as any)
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
    projectId: project.id,
    projectSlug: project.slug,
    surveyId: survey.id,
    usage: result.usage,
  }
}

// Response validation limits
const MAX_TEXT_LENGTH = 10000
const MAX_MULTISELECT_OPTIONS = 50
const MAX_OPTION_LENGTH = 500

/**
 * Validate and sanitize survey response based on type
 */
function validateResponse(response: unknown): { valid: boolean; sanitized: unknown; error?: string } {
  // Null/undefined is valid (question skipped)
  if (response === null || response === undefined) {
    return { valid: true, sanitized: null }
  }

  // String responses (text, textarea, select)
  if (typeof response === 'string') {
    const trimmed = response.trim().slice(0, MAX_TEXT_LENGTH)
    return { valid: true, sanitized: trimmed }
  }

  // Number responses (scale, rating)
  if (typeof response === 'number') {
    if (!Number.isFinite(response) || response < -1000 || response > 1000) {
      return { valid: false, sanitized: null, error: 'Invalid number value' }
    }
    return { valid: true, sanitized: response }
  }

  // Array responses (multiselect)
  if (Array.isArray(response)) {
    if (response.length > MAX_MULTISELECT_OPTIONS) {
      return { valid: false, sanitized: null, error: 'Too many options selected' }
    }
    const sanitized = response
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().slice(0, MAX_OPTION_LENGTH))
      .filter((item) => item.length > 0)
    return { valid: true, sanitized }
  }

  // Reject objects and other types
  return { valid: false, sanitized: null, error: 'Invalid response type' }
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

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(surveyId) || !questionId || questionId.length > 100) {
    return { success: false, error: 'Invalid survey or question ID' }
  }

  // Validate and sanitize response
  const validation = validateResponse(response)
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid response' }
  }

  // Verify user owns the survey
  const { data: survey, error: surveyCheckError } = await supabase
    .from('studio_surveys')
    .select('id, project:studio_projects!inner(user_id)')
    .eq('id', surveyId)
    .single()

  if (surveyCheckError || !survey) {
    return { success: false, error: 'Survey not found' }
  }

  // Access project from inner join
  const projectUserId = (survey as { project: { user_id: string } }).project.user_id
  if (projectUserId !== user.id) {
    return { success: false, error: 'Access denied' }
  }

  // Serialize response for text column
  const sanitizedResponse = validation.sanitized
  const responseText =
    typeof sanitizedResponse === 'string' ? sanitizedResponse : JSON.stringify(sanitizedResponse)

  // Upsert response
  const { error } = await supabase
    .from('studio_survey_responses')
    .upsert(
      {
        survey_id: surveyId,
        question_id: questionId,
        response_value: sanitizedResponse,
        response_text: responseText,
      } as any,
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
 * Get generated artifacts for a completed survey
 */
export async function getSurveyArtifacts(projectId: string) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized', data: null }
  }

  // Fetch all artifacts linked to this project
  const [hypotheses, assumptions, experiments, profiles] = await Promise.all([
    supabase
      .from('studio_hypotheses')
      .select('id, statement, rationale, validation_criteria, status')
      .eq('project_id', projectId)
      .order('created_at'),
    supabase
      .from('assumptions')
      .select('id, statement, category, importance, is_leap_of_faith, status')
      .eq('studio_project_id', projectId)
      .order('created_at'),
    supabase
      .from('studio_experiments')
      .select('id, name, description, type, expected_outcome, status')
      .eq('project_id', projectId)
      .order('created_at'),
    supabase
      .from('customer_profiles')
      .select('id, name, profile_type, jobs, pains, gains')
      .eq('studio_project_id', projectId)
      .order('created_at'),
  ])

  return {
    success: true,
    data: {
      hypotheses: hypotheses.data || [],
      assumptions: assumptions.data || [],
      experiments: experiments.data || [],
      customerProfiles: profiles.data || [],
    },
  }
}

// Allowed artifact types (whitelist)
const ARTIFACT_TYPES = ['hypothesis', 'assumption', 'experiment', 'customer_profile'] as const
type ArtifactType = (typeof ARTIFACT_TYPES)[number]

const ARTIFACT_TABLE_MAP: Record<ArtifactType, string> = {
  hypothesis: 'studio_hypotheses',
  assumption: 'assumptions',
  experiment: 'studio_experiments',
  customer_profile: 'customer_profiles',
}

// Project foreign key field for each artifact type
const ARTIFACT_PROJECT_FK: Record<ArtifactType, string> = {
  hypothesis: 'project_id',
  assumption: 'studio_project_id',
  experiment: 'project_id',
  customer_profile: 'studio_project_id',
}

/**
 * Verify user owns the artifact by checking the linked project
 */
async function verifyArtifactOwnership(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  type: ArtifactType,
  id: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const table = ARTIFACT_TABLE_MAP[type]
  const fkField = ARTIFACT_PROJECT_FK[type]

  // Validate UUID format to prevent injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(id)) {
    return { success: false, error: 'Invalid artifact ID format' }
  }

  // Fetch artifact with its project to verify ownership
  const { data: artifact, error } = await (supabase as any)
    .from(table)
    .select(`id, ${fkField}`)
    .eq('id', id)
    .single()

  if (error || !artifact) {
    return { success: false, error: 'Artifact not found' }
  }

  const projectId = (artifact as any)[fkField]

  // Verify user owns the project
  const { data: project, error: projectError } = await supabase
    .from('studio_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  if (projectError || !project) {
    return { success: false, error: 'Access denied' }
  }

  return { success: true }
}

/**
 * Delete a survey-generated artifact
 */
export async function deleteSurveyArtifact(type: string, id: string) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate artifact type (whitelist)
  if (!ARTIFACT_TYPES.includes(type as ArtifactType)) {
    return { success: false, error: 'Invalid artifact type' }
  }
  const artifactType = type as ArtifactType

  // Verify ownership before deletion
  const ownership = await verifyArtifactOwnership(supabase, artifactType, id, user.id)
  if (!ownership.success) {
    return { success: false, error: ownership.error || 'Access denied' }
  }

  const table = ARTIFACT_TABLE_MAP[artifactType]
  const { error } = await (supabase as any).from(table).delete().eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/studio')
  return { success: true }
}

// Allowed fields for each artifact type (whitelist for updates)
const ARTIFACT_ALLOWED_FIELDS: Record<ArtifactType, string[]> = {
  hypothesis: ['statement', 'rationale', 'validation_criteria', 'status'],
  assumption: ['statement', 'category', 'importance', 'is_leap_of_faith', 'status'],
  experiment: ['name', 'description', 'type', 'expected_outcome', 'status'],
  customer_profile: ['name', 'profile_type', 'jobs', 'pains', 'gains'],
}

/**
 * Sanitize and validate update data
 */
function sanitizeUpdateData(
  type: ArtifactType,
  data: Record<string, unknown>
): Record<string, unknown> | null {
  const allowedFields = ARTIFACT_ALLOWED_FIELDS[type]
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    // Only allow whitelisted fields
    if (!allowedFields.includes(key)) {
      continue
    }

    // Sanitize string values (basic XSS prevention)
    if (typeof value === 'string') {
      // Limit length and trim
      sanitized[key] = value.slice(0, 10000).trim()
    } else if (typeof value === 'boolean' || typeof value === 'number') {
      sanitized[key] = value
    }
    // Skip any other types (objects, arrays, etc.) for security
  }

  // Must have at least one valid field to update
  if (Object.keys(sanitized).length === 0) {
    return null
  }

  return sanitized
}

/**
 * Update a survey-generated artifact
 */
export async function updateSurveyArtifact(
  type: string,
  id: string,
  data: Record<string, unknown>
) {
  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Validate artifact type (whitelist)
  if (!ARTIFACT_TYPES.includes(type as ArtifactType)) {
    return { success: false, error: 'Invalid artifact type' }
  }
  const artifactType = type as ArtifactType

  // Verify ownership before update
  const ownership = await verifyArtifactOwnership(supabase, artifactType, id, user.id)
  if (!ownership.success) {
    return { success: false, error: ownership.error || 'Access denied' }
  }

  // Sanitize and validate update data
  const sanitizedData = sanitizeUpdateData(artifactType, data)
  if (!sanitizedData) {
    return { success: false, error: 'No valid fields to update' }
  }

  const table = ARTIFACT_TABLE_MAP[artifactType]
  const { error } = await (supabase as any).from(table).update(sanitizedData).eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/studio')
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
    .select('id, slug, name, description, temperature, has_pending_survey')
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
