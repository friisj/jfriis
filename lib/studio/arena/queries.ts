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
  ArenaProjectTheme,
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
// PROJECT THEMES
// =============================================================================

export async function getProjectThemes(
  projectId: string,
  platform?: string
): Promise<ProjectTheme> {
  const supabase = await arenaClient()
  let query = supabase
    .from('arena_project_themes')
    .select('*')
    .eq('project_id', projectId)

  if (platform) query = query.eq('platform', platform)
  else query = query.eq('platform', 'tailwind')

  const { data, error } = await query
  if (error) throw error

  const theme: ProjectTheme = {}
  for (const row of (data ?? []) as unknown as ArenaProjectTheme[]) {
    theme[row.dimension] = { tokens: row.tokens, source: row.source }
  }
  return theme
}

export async function upsertProjectTheme(
  projectId: string,
  dimension: string,
  platform: string,
  tokens: TokenMap,
  source: string
): Promise<ArenaProjectTheme> {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_project_themes')
    .upsert(
      {
        project_id: projectId,
        dimension,
        platform,
        tokens,
        source,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,dimension,platform' }
    )
    .select()
    .single()
  if (error) throw error
  return data as unknown as ArenaProjectTheme
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
