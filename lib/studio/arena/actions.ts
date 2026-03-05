'use server'

import { createClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import type { SkillState, ArenaAnnotation, SkillTier, ProjectConfig, TokenMap, DimensionState } from './types'
import { CORE_DIMENSIONS, extractTokensFromDimension } from './types'
import { BASE_SKILL, BASE_THEME_TOKENS } from './base-skill'
import type { ArenaProjectInputs } from './db-types'
import { getTemplateSkills, getTemplateThemes, getProjectAssembly, getProjectThemes } from './queries'

// Arena tables aren't in the generated Supabase types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function arenaClient(): Promise<SupabaseClient<any, 'public', any>> {
  return await createClient() as any // eslint-disable-line @typescript-eslint/no-explicit-any
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

// =============================================================================
// PROJECTS
// =============================================================================

export async function createProjectAction(formData: FormData) {
  const name = formData.get('name') as string
  const description = (formData.get('description') as string) || null
  const themeTemplate = (formData.get('theme_template') as string) || null

  // Parse dimension config from form — all get basic scope
  const dimensionKeys = (formData.getAll('dimensions') as string[])
  const config: ProjectConfig = { dimensions: {} }
  for (const dim of dimensionKeys) {
    config.dimensions[dim] = { scope: 'basic' }
  }
  // Default to core dimensions if none selected
  if (Object.keys(config.dimensions).length === 0) {
    for (const dim of CORE_DIMENSIONS) {
      config.dimensions[dim] = { scope: 'basic' }
    }
  }

  if (!name?.trim()) throw new Error('Name is required')

  const metadata: Record<string, unknown> = {}
  if (themeTemplate) metadata.theme_template = themeTemplate

  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_projects')
    .insert({
      name: name.trim(),
      slug: generateSlug(name),
      description,
      config: config as unknown as Record<string, unknown>,
      metadata,
    })
    .select()
    .single()

  if (error) throw error

  const projectId = data.id as string

  // Clone base template skills for each selected dimension (skills only — no themes)
  const templateSkills = await getTemplateSkills()
  for (const templateSkill of templateSkills) {
    if (templateSkill.dimension && config.dimensions[templateSkill.dimension]) {
      await cloneTemplateToProject(templateSkill.id, projectId)
    }
  }

  // Clone theme tokens — from selected theme template, or from base 'default' templates
  const themeSource = await getTemplateThemes(themeTemplate ?? 'default')
  for (const theme of themeSource) {
    if (!config.dimensions[theme.dimension]) continue
    const supabase2 = await arenaClient()
    await supabase2
      .from('arena_themes')
      .insert({
        project_id: projectId,
        skill_id: null,
        dimension: theme.dimension,
        platform: theme.platform,
        name: theme.name,
        tokens: theme.tokens,
        source: 'template-clone',
      })
  }

  revalidatePath('/apps/arena')
  return data
}

export async function deleteProjectAction(id: string) {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_projects').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// SKILLS — composite mutations
// =============================================================================

export async function saveImportedSkill(input: {
  name: string
  state: SkillState
  tier?: SkillTier
  project_id?: string
  parent_skill_id?: string
  themeTokens?: Record<string, Record<string, string>>
}) {
  const supabase = await arenaClient()
  const tier = input.tier ?? 'project'
  const dimensions = Object.keys(input.state)

  // Create one per-dimension skill for each dimension
  // Strip token values from decisions — they go into the theme layer
  const dimensionSkillIds: Record<string, string> = {}
  for (const dim of dimensions) {
    const dimState = input.state[dim]
    if (!dimState?.decisions) continue
    const strippedDecisions = dimState.decisions.map(d => {
      const { value: _value, ...rest } = d
      return rest
    })
    const { data, error } = await supabase
      .from('arena_skills')
      .insert({
        name: `${input.name} — ${dim}`,
        state: { decisions: strippedDecisions, rules: dimState.rules } as unknown as Record<string, unknown>,
        tier,
        dimension: dim,
        project_id: input.project_id ?? null,
        parent_skill_id: input.parent_skill_id ?? null,
      })
      .select()
      .single()
    if (error) throw error
    dimensionSkillIds[dim] = data.id
  }

  // If project_id provided, set up the project assembly and seed theme rows
  if (input.project_id) {
    for (const dim of dimensions) {
      // Set assembly slot
      const { error } = await supabase
        .from('arena_project_assembly')
        .upsert(
          {
            project_id: input.project_id,
            dimension: dim,
            skill_id: dimensionSkillIds[dim],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'project_id,dimension' }
        )
      if (error) throw error

      // Use pre-classified theme tokens if available, fall back to extracting from decisions
      const tokens = input.themeTokens?.[dim] ?? extractTokensFromDimension(input.state[dim])
      if (Object.keys(tokens).length > 0) {
        const { data: existingTheme } = await supabase
          .from('arena_themes')
          .select('id')
          .eq('project_id', input.project_id)
          .is('skill_id', null)
          .eq('dimension', dim)
          .eq('platform', 'tailwind')
          .eq('name', 'default')
          .maybeSingle()

        if (existingTheme) {
          const { error: themeErr } = await supabase
            .from('arena_themes')
            .update({ tokens, source: tier === 'project' ? 'import' : tier, updated_at: new Date().toISOString() })
            .eq('id', existingTheme.id)
          if (themeErr) throw themeErr
        } else {
          const { error: themeErr } = await supabase
            .from('arena_themes')
            .insert({
              project_id: input.project_id,
              dimension: dim,
              platform: 'tailwind',
              name: 'default',
              tokens,
              source: tier === 'project' ? 'import' : tier,
            })
          if (themeErr) throw themeErr
        }
      }
    }
  }

  revalidatePath('/apps/arena')
  // Return the first dimension skill id as the "primary" result
  const firstDim = dimensions[0]
  return { id: dimensionSkillIds[firstDim], dimensionSkillIds }
}

export async function deleteSkillAction(id: string) {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_skills').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// SESSIONS — gym persistence
// =============================================================================

interface FeedbackItem {
  dimension: string
  decision_label: string
  action: 'approve' | 'adjust' | 'flag'
  new_value?: string
  reason?: string
}

export async function completeGymRound(input: {
  session_id: string
  round: number
  feedback: FeedbackItem[]
  annotations: ArenaAnnotation[]
  skill_state: SkillState
  ai_summary?: string
  theme_updates?: Record<string, TokenMap>
}) {
  const supabase = await arenaClient()

  // Insert feedback rows
  if (input.feedback.length > 0) {
    const feedbackRows = input.feedback.map((f) => ({
      session_id: input.session_id,
      round: input.round,
      dimension: f.dimension,
      decision_label: f.decision_label,
      action: f.action,
      new_value: f.new_value ?? null,
      reason: f.reason ?? null,
    }))
    const { error: fbError } = await supabase
      .from('arena_session_feedback')
      .insert(feedbackRows)
    if (fbError) throw fbError
  }

  // Insert annotation rows
  if (input.annotations.length > 0) {
    const annotationRows = input.annotations.map((a) => ({
      session_id: input.session_id,
      round: input.round,
      hat_key: a.hatKey,
      segments: a.segments,
    }))
    const { error: annError } = await supabase
      .from('arena_session_annotations')
      .insert(annotationRows)
    if (annError) throw annError
  }

  // Insert iteration snapshot
  const { error: itError } = await supabase
    .from('arena_session_iterations')
    .insert({
      session_id: input.session_id,
      round: input.round,
      skill_state: input.skill_state as unknown as Record<string, unknown>,
      ai_summary: input.ai_summary ?? null,
    })
  if (itError) throw itError

  // Update session round count
  const { error: sessError } = await supabase
    .from('arena_sessions')
    .update({ round_count: input.round })
    .eq('id', input.session_id)
  if (sessError) throw sessError

  // Persist theme corrections if session has a project and theme_updates exist
  if (input.theme_updates) {
    const { data: session } = await supabase
      .from('arena_sessions')
      .select('project_id')
      .eq('id', input.session_id)
      .single()

    if (session?.project_id) {
      for (const [dim, tokens] of Object.entries(input.theme_updates)) {
        if (Object.keys(tokens).length === 0) continue

        // Merge with existing theme tokens (additive)
        const { data: existing } = await supabase
          .from('arena_themes')
          .select('tokens')
          .eq('project_id', session.project_id)
          .eq('dimension', dim)
          .eq('platform', 'tailwind')
          .single()

        const mergedTokens = { ...(existing?.tokens as TokenMap ?? {}), ...tokens }

        // Find existing theme row for this project+dimension
        const { data: existingTheme } = await supabase
          .from('arena_themes')
          .select('id')
          .eq('project_id', session.project_id)
          .is('skill_id', null)
          .eq('dimension', dim)
          .eq('platform', 'tailwind')
          .eq('name', 'default')
          .maybeSingle()

        if (existingTheme) {
          const { error: themeErr } = await supabase
            .from('arena_themes')
            .update({ tokens: mergedTokens, source: 'gym', updated_at: new Date().toISOString() })
            .eq('id', existingTheme.id)
          if (themeErr) throw themeErr
        } else {
          const { error: themeErr } = await supabase
            .from('arena_themes')
            .insert({
              project_id: session.project_id,
              skill_id: null,
              dimension: dim,
              platform: 'tailwind',
              name: 'default',
              tokens: mergedTokens,
              source: 'gym',
            })
          if (themeErr) throw themeErr
        }
      }
    }
  }

  revalidatePath('/apps/arena')
}

export async function acceptRefinement(input: {
  session_id: string
  final_skill_state: SkillState
  input_skill_name: string
}) {
  const supabase = await arenaClient()

  // Get the session to find input_skill_id, project_id, target_dimension
  const { data: session, error: sessErr } = await supabase
    .from('arena_sessions')
    .select('input_skill_id, project_id, target_dimension')
    .eq('id', input.session_id)
    .single()
  if (sessErr || !session) throw new Error('Session not found')

  const targetDim = session.target_dimension as string | null

  // Create output skill — per-dimension if session targets a dimension, otherwise full
  const outputState = targetDim
    ? input.final_skill_state[targetDim]
    : input.final_skill_state
  const { data: outputSkill, error: skillErr } = await supabase
    .from('arena_skills')
    .insert({
      name: `${input.input_skill_name} (refined)`,
      state: outputState as unknown as Record<string, unknown>,
      tier: 'refined',
      dimension: targetDim ?? null,
      parent_skill_id: session.input_skill_id,
      project_id: session.project_id ?? null,
    })
    .select()
    .single()
  if (skillErr) throw skillErr

  // Complete the session
  const { error: updateErr } = await supabase
    .from('arena_sessions')
    .update({
      output_skill_id: outputSkill.id,
      status: 'completed',
    })
    .eq('id', input.session_id)
  if (updateErr) throw updateErr

  // Update project assembly if session targets a project + dimension
  if (session.project_id && targetDim) {
    const { error: asmErr } = await supabase
      .from('arena_project_assembly')
      .upsert(
        {
          project_id: session.project_id,
          dimension: targetDim,
          skill_id: outputSkill.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,dimension' }
      )
    if (asmErr) throw asmErr
  }

  revalidatePath('/apps/arena')
  return outputSkill
}

export async function abandonSession(sessionId: string) {
  const supabase = await arenaClient()
  const { error } = await supabase
    .from('arena_sessions')
    .update({ status: 'abandoned' })
    .eq('id', sessionId)
  if (error) throw error
  revalidatePath('/apps/arena')
}

export async function createSessionAction(input: {
  input_skill_id: string
  project_id?: string
  target_dimension?: string
  config?: Record<string, unknown>
  component_ids?: string[]
  notes?: string
}) {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_sessions')
    .insert({
      input_skill_id: input.input_skill_id,
      project_id: input.project_id ?? null,
      target_dimension: input.target_dimension ?? null,
      config: input.config ?? {},
      status: 'active',
      round_count: 0,
      notes: input.notes ?? null,
    })
    .select()
    .single()
  if (error) throw error

  // Link selected test components
  if (input.component_ids && input.component_ids.length > 0) {
    const rows = input.component_ids.map((component_id) => ({
      session_id: data.id,
      component_id,
    }))
    const { error: compErr } = await supabase
      .from('arena_session_components')
      .insert(rows)
    if (compErr) throw compErr
  }

  revalidatePath('/apps/arena')
  return data
}

// =============================================================================
// TEMPLATES
// =============================================================================

export async function seedBaseTemplates() {
  const supabase = await arenaClient()

  // Dimension-aware: check which dimensions already have template skills
  const { data: existing } = await supabase
    .from('arena_skills')
    .select('dimension')
    .eq('is_template', true)
    .eq('tier', 'template')

  const existingDims = new Set((existing ?? []).map((s: { dimension: string }) => s.dimension))
  const allDims = Object.keys(BASE_SKILL)
  const missingDims = allDims.filter(dim => !existingDims.has(dim))

  if (missingDims.length === 0) {
    return { seeded: false, message: 'All base templates already exist' }
  }

  const templateIds: Record<string, string> = {}
  for (const dim of missingDims) {
    const dimState = BASE_SKILL[dim]
    if (!dimState) continue

    // Create the template skill (intent-only, no token values)
    const { data, error } = await supabase
      .from('arena_skills')
      .insert({
        name: `Base — ${dim.charAt(0).toUpperCase() + dim.slice(1)}`,
        state: dimState as unknown as Record<string, unknown>,
        tier: 'template',
        dimension: dim,
        project_id: null,
        parent_skill_id: null,
        is_template: true,
        template_description: `Default ${dim} decisions from the Arena base skill.`,
      })
      .select()
      .single()
    if (error) throw error
    templateIds[dim] = data.id

    // Create associated theme config with the default token values
    const tokens = BASE_THEME_TOKENS[dim]
    if (tokens && Object.keys(tokens).length > 0) {
      const { error: themeErr } = await supabase
        .from('arena_themes')
        .insert({
          skill_id: data.id,
          project_id: null,
          is_template: true,
          dimension: dim,
          platform: 'tailwind',
          name: 'default',
          tokens,
          source: 'base',
        })
      if (themeErr) throw themeErr
    }
  }

  revalidatePath('/apps/arena')
  return { seeded: true, templateIds }
}

export async function updateBaseTemplates() {
  const supabase = await arenaClient()

  // Update template skills with latest BASE_SKILL state
  const { data: templateSkills } = await supabase
    .from('arena_skills')
    .select('id, dimension')
    .eq('is_template', true)
    .eq('tier', 'template')
  if (!templateSkills) return { updated: false, message: 'No template skills found' }

  const skillUpdates: string[] = []
  for (const skill of templateSkills) {
    const dim = skill.dimension as string
    const dimState = BASE_SKILL[dim]
    if (!dimState) continue
    const { error } = await supabase
      .from('arena_skills')
      .update({ state: dimState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq('id', skill.id)
    if (error) throw error
    skillUpdates.push(dim)
  }

  // Update template themes with latest BASE_THEME_TOKENS
  const { data: templateThemes } = await supabase
    .from('arena_themes')
    .select('id, dimension, skill_id')
    .eq('is_template', true)
  if (!templateThemes) return { updated: true, skillUpdates, themeUpdates: [] }

  const themeUpdates: string[] = []
  for (const theme of templateThemes) {
    const dim = theme.dimension as string
    const tokens = BASE_THEME_TOKENS[dim]
    if (!tokens) continue
    const { error } = await supabase
      .from('arena_themes')
      .update({ tokens, updated_at: new Date().toISOString() })
      .eq('id', theme.id)
    if (error) throw error
    themeUpdates.push(dim)
  }

  // Propagate to existing project clones:
  // Update project skills that were cloned from templates (tier='project', parent_skill_id points to template)
  const templateSkillIds = templateSkills.map(s => s.id as string)
  if (templateSkillIds.length > 0) {
    const { data: cloneSkills } = await supabase
      .from('arena_skills')
      .select('id, parent_skill_id, dimension')
      .eq('tier', 'project')
      .in('parent_skill_id', templateSkillIds)
    if (cloneSkills) {
      for (const clone of cloneSkills) {
        const dim = clone.dimension as string
        const dimState = BASE_SKILL[dim]
        if (!dimState) continue
        const { error } = await supabase
          .from('arena_skills')
          .update({ state: dimState as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
          .eq('id', clone.id)
        if (error) throw error
      }
    }
  }

  // Update project themes that were cloned from templates (source='template-clone')
  const { data: cloneThemes } = await supabase
    .from('arena_themes')
    .select('id, dimension')
    .eq('source', 'template-clone')
  if (cloneThemes) {
    for (const clone of cloneThemes) {
      const dim = clone.dimension as string
      const tokens = BASE_THEME_TOKENS[dim]
      if (!tokens) continue
      const { error } = await supabase
        .from('arena_themes')
        .update({ tokens, updated_at: new Date().toISOString() })
        .eq('id', clone.id)
      if (error) throw error
    }
  }

  revalidatePath('/apps/arena')
  return { updated: true, skillUpdates, themeUpdates }
}

export async function cloneTemplateToProject(templateId: string, projectId: string) {
  const supabase = await arenaClient()

  // Get template
  const { data: template, error: tErr } = await supabase
    .from('arena_skills')
    .select('*')
    .eq('id', templateId)
    .single()
  if (tErr || !template) throw new Error('Template not found')

  // Create clone
  const { data: clone, error: cErr } = await supabase
    .from('arena_skills')
    .insert({
      name: `${template.name} (clone)`,
      state: template.state,
      tier: 'project',
      dimension: template.dimension,
      project_id: projectId,
      parent_skill_id: templateId,
      is_template: false,
    })
    .select()
    .single()
  if (cErr) throw cErr

  // Set project assembly if dimension is set
  if (template.dimension) {
    const { error: aErr } = await supabase
      .from('arena_project_assembly')
      .upsert(
        {
          project_id: projectId,
          dimension: template.dimension,
          skill_id: clone.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id,dimension' }
      )
    if (aErr) throw aErr
  }

  revalidatePath('/apps/arena')
  return clone
}

// =============================================================================
// TEST COMPONENTS — mutations
// =============================================================================

export async function createTestComponent(input: {
  name: string
  slug: string
  component_key: string
  category: string
  description?: string
  is_default?: boolean
}) {
  const supabase = await arenaClient()
  const { data, error } = await supabase
    .from('arena_test_components')
    .insert({
      name: input.name,
      slug: input.slug,
      component_key: input.component_key,
      category: input.category,
      description: input.description ?? null,
      is_default: input.is_default ?? false,
      metadata: {},
    })
    .select()
    .single()
  if (error) throw error
  revalidatePath('/apps/arena')
  return data
}

export async function deleteTestComponent(id: string) {
  const supabase = await arenaClient()
  const { error } = await supabase.from('arena_test_components').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// PROJECT INPUTS
// =============================================================================

export async function updateProjectInputs(projectId: string, inputs: ArenaProjectInputs) {
  const supabase = await arenaClient()
  const { error } = await supabase
    .from('arena_projects')
    .update({ inputs: inputs as unknown as Record<string, unknown> })
    .eq('id', projectId)
  if (error) throw error
  revalidatePath('/apps/arena')
}

// =============================================================================
// FOUNDATION GENERATION
// =============================================================================

export async function generateFoundation(projectId: string) {
  const supabase = await arenaClient()

  // Get the project
  const { data: project, error: projErr } = await supabase
    .from('arena_projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (projErr || !project) throw new Error('Project not found')

  // Gather current assembly skills and project themes
  const [assembly, projectTheme] = await Promise.all([
    getProjectAssembly(projectId),
    getProjectThemes(projectId),
  ])

  const dimensions = project.config?.dimensions
    ? Object.keys(project.config.dimensions)
    : CORE_DIMENSIONS

  // Build current skills map from assembly
  const currentSkills: Record<string, DimensionState> = {}
  for (const entry of assembly) {
    if (entry.skill?.state && 'decisions' in entry.skill.state) {
      currentSkills[entry.dimension] = entry.skill.state as DimensionState
    }
  }

  // Build current tokens map from project themes
  const currentTokens: Record<string, TokenMap> = {}
  for (const [dim, theme] of Object.entries(projectTheme)) {
    if (theme.tokens && Object.keys(theme.tokens).length > 0) {
      currentTokens[dim] = theme.tokens
    }
  }

  // Use the AI action system
  const { executeAction } = await import('@/lib/ai/actions')
  await import('@/lib/ai/actions/arena-generate-foundation')

  const result = await executeAction('arena-generate-foundation', {
    description: project.description ?? null,
    inputs: project.inputs,
    dimensions,
    currentSkills,
    currentTokens,
  })

  if (!result.success) {
    throw new Error(result.error?.message ?? 'Foundation generation failed')
  }

  const output = result.data as {
    skills: Record<string, DimensionState>
    tokens: Record<string, TokenMap>
    summary: string
    gaps: Array<{ dimension: string; description: string; severity: string }>
  }

  // Write skills back: update each dimension's assembly skill state
  for (const entry of assembly) {
    const updatedState = output.skills[entry.dimension]
    if (updatedState && entry.skill_id) {
      const { error: skillErr } = await supabase
        .from('arena_skills')
        .update({
          state: updatedState as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.skill_id)
      if (skillErr) throw skillErr
    }
  }

  // Write tokens back: upsert project theme rows
  for (const [dim, tokens] of Object.entries(output.tokens)) {
    if (Object.keys(tokens).length === 0) continue

    const { data: existing } = await supabase
      .from('arena_themes')
      .select('id')
      .eq('project_id', projectId)
      .is('skill_id', null)
      .eq('dimension', dim)
      .eq('platform', 'tailwind')
      .eq('name', 'default')
      .maybeSingle()

    if (existing) {
      const { error: themeErr } = await supabase
        .from('arena_themes')
        .update({ tokens, source: 'foundation', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (themeErr) throw themeErr
    } else {
      const { error: themeErr } = await supabase
        .from('arena_themes')
        .insert({
          project_id: projectId,
          skill_id: null,
          dimension: dim,
          platform: 'tailwind',
          name: 'default',
          tokens,
          source: 'foundation',
        })
      if (themeErr) throw themeErr
    }
  }

  // Store foundation brief on project
  const foundation = {
    summary: output.summary,
    gaps: output.gaps,
    generated_at: new Date().toISOString(),
  }

  const { error: updateErr } = await supabase
    .from('arena_projects')
    .update({ foundation: foundation as unknown as Record<string, unknown> })
    .eq('id', projectId)
  if (updateErr) throw updateErr

  revalidatePath('/apps/arena')
  return foundation
}
