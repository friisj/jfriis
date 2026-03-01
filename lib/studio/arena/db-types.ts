import type { SkillState, AnnotationSegment } from './types'

// =============================================================================
// arena_projects
// =============================================================================

export interface ArenaProject {
  id: string
  name: string
  slug: string
  description: string | null
  figma_file_key: string | null
  figma_file_url: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ArenaProjectInsert = Omit<ArenaProject, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// =============================================================================
// arena_skills
// =============================================================================

export interface ArenaSkill {
  id: string
  name: string
  state: SkillState
  source: 'figma' | 'manual' | 'refined' | 'base'
  parent_skill_id: string | null
  project_id: string | null
  created_at: string
  updated_at: string
}

export interface ArenaSkillWithLineage extends ArenaSkill {
  parent_skill?: ArenaSkill | null
  children?: ArenaSkill[]
  project?: ArenaProject | null
}

export type ArenaSkillInsert = Omit<ArenaSkill, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// =============================================================================
// arena_sessions
// =============================================================================

export interface ArenaSession {
  id: string
  input_skill_id: string
  output_skill_id: string | null
  status: 'active' | 'completed' | 'abandoned'
  round_count: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ArenaSessionWithSkills extends ArenaSession {
  input_skill?: ArenaSkill | null
  output_skill?: ArenaSkill | null
}

export type ArenaSessionInsert = Omit<ArenaSession, 'id' | 'created_at' | 'updated_at' | 'round_count'> & {
  id?: string
  round_count?: number
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
  dimension: 'color' | 'typography' | 'spacing'
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
