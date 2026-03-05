import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ArenaProject,
  ArenaSkill,
  ArenaSkillWithLineage,
  ArenaSession,
  ArenaSessionWithSkills,
  ArenaSessionAnnotation,
  ArenaSessionFeedback,
  ArenaSessionIteration,
  ArenaProjectAssembly,
  ArenaProjectAssemblyWithSkill,
  ArenaTestComponent,
  ArenaTheme,
} from './db-types'
import type { SkillTier, ProjectTheme, TokenMap } from './types'

// Arena tables aren't in the generated Supabase types yet.
// This helper provides an untyped client for arena table access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function arenaClient(): Promise<SupabaseClient<any, 'public', any>> {
  return await createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

// =============================================================================
// PROJECTS
// =============================================================================

export async function getProjects(): Promise<ArenaProject[]> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ArenaProject[]
}

export async function getProject(id: string): Promise<ArenaProject | null> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as ArenaProject
}

export async function createProject(project: {
  name: string
  slug: string
  description?: string
  figma_file_key?: string
  figma_file_url?: string
  metadata?: Record<string, unknown>
}): Promise<ArenaProject> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .insert(project)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaProject
}

export async function updateProject(id: string, updates: Record<string, unknown>): Promise<ArenaProject> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaProject
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_projects').delete().eq('id', id)
  if (error) throw error
}

// =============================================================================
// PROJECT ASSEMBLY
// =============================================================================

export async function getProjectAssembly(projectId: string): Promise<ArenaProjectAssemblyWithSkill[]> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_project_assembly')
    .select('*, skill:arena_skills(*)')
    .eq('project_id', projectId)
    .order('dimension')
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...(row as unknown as ArenaProjectAssembly),
    skill: (row.skill as unknown as ArenaSkill) ?? null,
  })) as ArenaProjectAssemblyWithSkill[]
}

export async function setAssemblySkill(
  projectId: string,
  dimension: string,
  skillId: string
): Promise<ArenaProjectAssembly> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_project_assembly')
    .upsert(
      { project_id: projectId, dimension, skill_id: skillId, updated_at: new Date().toISOString() },
      { onConflict: 'project_id,dimension' }
    )
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaProjectAssembly
}

export async function removeAssemblySlot(
  projectId: string,
  dimension: string
): Promise<void> {
  const supabase = await arenaClient()
  const { error } = await supabase
    .from('arena_project_assembly')
    .delete()
    .eq('project_id', projectId)
    .eq('dimension', dimension)
  if (error) throw error
}

// =============================================================================
// SKILLS
// =============================================================================

export async function getSkills(filter?: {
  tier?: string
  project_id?: string
  dimension?: string
  is_template?: boolean
}): Promise<ArenaSkill[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_skills')
    .select('*')
    .order('updated_at', { ascending: false })

  if (filter?.tier) query = query.eq('tier', filter.tier)
  if (filter?.project_id) query = query.eq('project_id', filter.project_id)
  if (filter?.dimension) query = query.eq('dimension', filter.dimension)
  if (filter?.is_template !== undefined) query = query.eq('is_template', filter.is_template)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ArenaSkill[]
}

export async function getSkill(id: string): Promise<ArenaSkill | null> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_skills')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as ArenaSkill
}

export async function getSkillWithLineage(id: string): Promise<ArenaSkillWithLineage | null> {
  const supabase = await arenaClient()

  // Get the skill with its parent and project
  const { data, error } = await supabase
    .from('arena_skills')
    .select('*, arena_projects(*)')
    .eq('id', id)
    .single()
  if (error) return null

  // Get parent skill if exists
  let parent_skill: ArenaSkill | null = null
  if (data.parent_skill_id) {
    const { data: parent } = await supabase
      .from('arena_skills')
      .select('*')
      .eq('id', data.parent_skill_id)
      .single()
    parent_skill = (parent as unknown as ArenaSkill) ?? null
  }

  // Get children
  const { data: children } = await supabase
    .from('arena_skills')
    .select('*')
    .eq('parent_skill_id', id)
    .order('created_at', { ascending: false })

  return {
    ...(data as unknown as ArenaSkill),
    project: (data.arena_projects as unknown as ArenaProject | null) ?? null,
    parent_skill,
    children: (children ?? []) as unknown as ArenaSkill[],
  } as ArenaSkillWithLineage
}

export async function createSkill(skill: {
  name: string
  state: Record<string, unknown>
  tier: SkillTier
  dimension?: string
  parent_skill_id?: string
  project_id?: string
  is_template?: boolean
  template_description?: string
}): Promise<ArenaSkill> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_skills')
    .insert(skill)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaSkill
}

export async function deleteSkill(id: string): Promise<void> {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_skills').delete().eq('id', id)
  if (error) throw error
}

// =============================================================================
// SESSIONS
// =============================================================================

export async function getSessions(filter?: {
  status?: string
  project_id?: string
}): Promise<ArenaSessionWithSkills[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_sessions')
    .select('*, input_skill:arena_skills!arena_sessions_input_skill_id_fkey(*), output_skill:arena_skills!arena_sessions_output_skill_id_fkey(*), project:arena_projects!arena_sessions_project_id_fkey(*)')
    .order('updated_at', { ascending: false })

  if (filter?.status) query = query.eq('status', filter.status)
  if (filter?.project_id) query = query.eq('project_id', filter.project_id)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...(row as unknown as ArenaSession),
    input_skill: (row.input_skill as unknown as ArenaSkill) ?? null,
    output_skill: (row.output_skill as unknown as ArenaSkill) ?? null,
    project: (row.project as unknown as ArenaProject) ?? null,
  })) as ArenaSessionWithSkills[]
}

export async function getSession(id: string): Promise<ArenaSessionWithSkills | null> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_sessions')
    .select('*, input_skill:arena_skills!arena_sessions_input_skill_id_fkey(*), output_skill:arena_skills!arena_sessions_output_skill_id_fkey(*), project:arena_projects!arena_sessions_project_id_fkey(*)')
    .eq('id', id)
    .single()
  if (error) return null
  return {
    ...(data as unknown as ArenaSession),
    input_skill: (data.input_skill as unknown as ArenaSkill) ?? null,
    output_skill: (data.output_skill as unknown as ArenaSkill) ?? null,
    project: (data.project as unknown as ArenaProject) ?? null,
  } as ArenaSessionWithSkills
}

export async function createSession(session: {
  input_skill_id: string
  project_id?: string
  target_dimension?: string
  config?: Record<string, unknown>
  notes?: string
}): Promise<ArenaSession> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_sessions')
    .insert({
      input_skill_id: session.input_skill_id,
      project_id: session.project_id ?? null,
      target_dimension: session.target_dimension ?? null,
      config: session.config ?? {},
      status: 'active',
      round_count: 0,
      notes: session.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaSession
}

export async function updateSession(id: string, updates: Record<string, unknown>): Promise<ArenaSession> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_sessions')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaSession
}

// =============================================================================
// SESSION ARTIFACTS
// =============================================================================

export async function getSessionIterations(sessionId: string): Promise<ArenaSessionIteration[]> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_session_iterations')
    .select('*')
    .eq('session_id', sessionId)
    .order('round')
  if (error) throw error
  return (data ?? []) as unknown as ArenaSessionIteration[]
}

export async function getSessionFeedback(sessionId: string, round?: number): Promise<ArenaSessionFeedback[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_session_feedback')
    .select('*')
    .eq('session_id', sessionId)
    .order('round')

  if (round !== undefined) query = query.eq('round', round)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ArenaSessionFeedback[]
}

export async function getSessionAnnotations(sessionId: string, round?: number): Promise<ArenaSessionAnnotation[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_session_annotations')
    .select('*')
    .eq('session_id', sessionId)
    .order('round')

  if (round !== undefined) query = query.eq('round', round)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ArenaSessionAnnotation[]
}

// =============================================================================
// TEST COMPONENTS
// =============================================================================

export async function getTestComponents(filter?: {
  category?: string
  is_default?: boolean
}): Promise<ArenaTestComponent[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_test_components')
    .select('*')
    .order('name')

  if (filter?.category) query = query.eq('category', filter.category)
  if (filter?.is_default !== undefined) query = query.eq('is_default', filter.is_default)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ArenaTestComponent[]
}

export async function getSessionComponents(sessionId: string): Promise<ArenaTestComponent[]> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_session_components')
    .select('component:arena_test_components(*)')
    .eq('session_id', sessionId)
  if (error) throw error
  return (data ?? []).map((row) => row.component as unknown as ArenaTestComponent)
}

export async function setSessionComponents(
  sessionId: string,
  componentIds: string[]
): Promise<void> {
  const supabase = await arenaClient()
  // Clear existing
  const { error: delError } = await supabase
    .from('arena_session_components')
    .delete()
    .eq('session_id', sessionId)
  if (delError) throw delError

  // Insert new
  if (componentIds.length > 0) {
    const rows = componentIds.map((component_id) => ({ session_id: sessionId, component_id }))
    const { error: insError } = await supabase
      .from('arena_session_components')
      .insert(rows)
    if (insError) throw insError
  }
}

// =============================================================================
// THEMES (formerly PROJECT THEMES)
// =============================================================================

/** Fetch raw theme rows with flexible filtering */
export async function getThemes(opts: {
  project_id?: string
  skill_id?: string
  is_template?: boolean
  platform?: string
  name?: string
}): Promise<ArenaTheme[]> {
  const supabase = await arenaClient()
  let query = supabase.from('arena_themes').select('*')

  if (opts.project_id) query = query.eq('project_id', opts.project_id)
  if (opts.skill_id) query = query.eq('skill_id', opts.skill_id)
  if (opts.is_template !== undefined) query = query.eq('is_template', opts.is_template)
  if (opts.platform) query = query.eq('platform', opts.platform)
  if (opts.name) query = query.eq('name', opts.name)

  const { data, error } = await query.order('dimension')
  if (error) throw error
  return (data ?? []) as unknown as ArenaTheme[]
}

/** Convenience: get project themes as a ProjectTheme map */
export async function getProjectThemes(
  projectId: string,
  platform?: string
): Promise<ProjectTheme> {
  const rows = await getThemes({
    project_id: projectId,
    platform: platform ?? 'tailwind',
  })

  const theme: ProjectTheme = {}
  for (const row of rows) {
    theme[row.dimension] = { tokens: row.tokens, source: row.source }
  }
  return theme
}

/** Fetch theme configs linked to a template skill */
export async function getThemesForSkill(
  skillId: string,
  platform?: string
): Promise<ArenaTheme[]> {
  return getThemes({ skill_id: skillId, platform: platform ?? 'tailwind' })
}

/** Fetch template skills (is_template=true, tier='template'), optionally filtered by dimension */
export async function getTemplateSkills(dimension?: string): Promise<ArenaSkill[]> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_skills')
    .select('*')
    .eq('is_template', true)
    .eq('tier', 'template')
  if (dimension) query = query.eq('dimension', dimension)
  const { data, error } = await query.order('dimension')
  if (error) throw error
  return (data ?? []) as unknown as ArenaSkill[]
}

/** Fetch all template themes, optionally filtered by name */
export async function getTemplateThemes(name?: string): Promise<ArenaTheme[]> {
  const supabase = await arenaClient()
  let query = supabase.from('arena_themes').select('*').eq('is_template', true)
  if (name) query = query.eq('name', name)
  const { data, error } = await query.order('dimension')
  if (error) throw error
  return (data ?? []) as unknown as ArenaTheme[]
}

/** Upsert a theme row — accepts project_id, skill_id, or is_template */
export async function upsertTheme(input: {
  project_id?: string
  skill_id?: string
  is_template?: boolean
  dimension: string
  platform: string
  name?: string
  tokens: TokenMap
  source: string
}): Promise<ArenaTheme> {
  const supabase = await arenaClient()
  const projectId = input.project_id ?? null
  const skillId = input.skill_id ?? null
  const name = input.name ?? 'default'

  // Find existing row matching the composite unique constraint
  let query = supabase
    .from('arena_themes')
    .select('id')
    .eq('dimension', input.dimension)
    .eq('platform', input.platform)
    .eq('name', name)

  if (projectId) {
    query = query.eq('project_id', projectId)
  } else {
    query = query.is('project_id', null)
  }
  if (skillId) {
    query = query.eq('skill_id', skillId)
  } else {
    query = query.is('skill_id', null)
  }

  const { data: existing } = await query.maybeSingle()

  if (existing) {
    // Update existing row
    const { data, error } = await supabase
      .from('arena_themes')
      .update({
        tokens: input.tokens,
        source: input.source,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data as unknown as ArenaTheme
  } else {
    // Insert new row
    const { data, error } = await supabase
      .from('arena_themes')
      .insert({
        project_id: projectId,
        skill_id: skillId,
        is_template: input.is_template ?? false,
        dimension: input.dimension,
        platform: input.platform,
        name,
        tokens: input.tokens,
        source: input.source,
      })
      .select()
      .single()
    if (error) throw error
    return data as unknown as ArenaTheme
  }
}

// =============================================================================
// COUNTS (for dashboard)
// =============================================================================

export async function getArenaCounts(): Promise<{
  projects: number
  skills: number
  sessions: number
  activeSessions: number
}> {
  const supabase = await arenaClient()
  const [projectsResult, skillsResult, sessionsResult] = await Promise.all([
    supabase.from('arena_projects').select('id', { count: 'exact', head: true }),
    supabase.from('arena_skills').select('id', { count: 'exact', head: true }),
    supabase.from('arena_sessions').select('id, status', { count: 'exact' }),
  ])

  const activeSessions = (sessionsResult.data ?? []).filter(
    (s) => s.status === 'active'
  ).length

  return {
    projects: projectsResult.count ?? 0,
    skills: skillsResult.count ?? 0,
    sessions: sessionsResult.count ?? 0,
    activeSessions,
  }
}
