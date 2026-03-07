import type { SkillState, DimensionState, AnnotationSegment, SkillTier, FoundationBrief, ProjectConfig, TokenMap } from './types'

// =============================================================================
// arena_projects
// =============================================================================

export interface ArenaProjectInputs {
  figma_links: { url: string }[]
  fonts: { role: string; family: string }[]
  images: string[]
  urls: string[]
  icon_library?: string
}

export interface ArenaProject {
  id: string
  name: string
  slug: string
  description: string | null
  figma_file_key: string | null
  figma_file_url: string | null
  inputs: ArenaProjectInputs
  substrate: string | null
  foundation: FoundationBrief | null
  config: ProjectConfig
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ArenaProjectInsert = Omit<ArenaProject, 'id' | 'created_at' | 'updated_at' | 'inputs'> & {
  id?: string
  inputs?: ArenaProjectInputs
}

// =============================================================================
// arena_skills
// =============================================================================

export interface ArenaSkill {
  id: string
  name: string
  state: SkillState | DimensionState
  tier: SkillTier
  dimension: string | null
  parent_skill_id: string | null
  project_id: string | null
  is_template: boolean
  template_description: string | null
  created_at: string
  updated_at: string
}

export interface ArenaSkillWithLineage extends ArenaSkill {
  parent_skill?: ArenaSkill | null
  children?: ArenaSkill[]
  project?: ArenaProject | null
}

export type ArenaSkillInsert = Omit<ArenaSkill, 'id' | 'created_at' | 'updated_at' | 'is_template' | 'template_description'> & {
  id?: string
  is_template?: boolean
  template_description?: string
}

export type { FoundationBrief, ProjectConfig } from './types'

// =============================================================================
// arena_sessions
// =============================================================================

export interface ArenaSession {
  id: string
  input_skill_id: string
  output_skill_id: string | null
  project_id: string | null
  target_dimension: string | null
  config: Record<string, unknown>
  status: 'active' | 'completed' | 'abandoned'
  round_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ArenaSessionWithSkills extends ArenaSession {
  input_skill?: ArenaSkill | null
  output_skill?: ArenaSkill | null
  project?: ArenaProject | null
}

export type ArenaSessionInsert = Omit<ArenaSession, 'id' | 'created_at' | 'updated_at' | 'round_count' | 'config'> & {
  id?: string
  round_count?: number
  config?: Record<string, unknown>
}

// =============================================================================
// arena_session_annotations
// =============================================================================

export interface ArenaSessionAnnotation {
  id: string
  session_id: string
  round: number
  hat_key: 'white' | 'red' | 'black' | 'yellow' | 'green' | 'blue'
  segments: AnnotationSegment[]
  created_at: string
}

// =============================================================================
// arena_session_feedback
// =============================================================================

export interface ArenaSessionFeedback {
  id: string
  session_id: string
  round: number
  dimension: string
  decision_label: string
  action: 'approve' | 'adjust' | 'flag'
  new_value: string | null
  reason: string | null
  created_at: string
}

// =============================================================================
// arena_session_iterations
// =============================================================================

export interface ArenaSessionIteration {
  id: string
  session_id: string
  round: number
  skill_state: SkillState
  ai_summary: string | null
  created_at: string
}

// =============================================================================
// arena_project_assembly
// =============================================================================

export interface ArenaProjectAssembly {
  id: string
  project_id: string
  dimension: string
  skill_id: string
  created_at: string
  updated_at: string
}

export interface ArenaProjectAssemblyWithSkill extends ArenaProjectAssembly {
  skill?: ArenaSkill | null
}

// =============================================================================
// arena_test_components
// =============================================================================

export interface ArenaTestComponent {
  id: string
  slug: string
  name: string
  description: string | null
  component_key: string
  category: string
  is_default: boolean
  metadata: Record<string, unknown>
  created_at: string
}

// =============================================================================
// arena_themes (formerly arena_project_themes)
// =============================================================================

export interface ArenaTheme {
  id: string
  project_id: string | null
  skill_id: string | null
  is_template: boolean
  dimension: string
  platform: string
  name: string
  tokens: TokenMap
  source: string
  created_at: string
  updated_at: string
}

/** @deprecated Use ArenaTheme instead */
export type ArenaProjectTheme = ArenaTheme

// =============================================================================
// arena_session_components
// =============================================================================

export interface ArenaSessionComponent {
  session_id: string
  component_id: string
}
