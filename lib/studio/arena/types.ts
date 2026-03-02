/**
 * Arena Skill Types
 *
 * Shared type definitions for the Arena design skill system.
 * Used by infer-style-spike, figma-import-spike, and AI actions.
 */

import type { DebonoHatKey } from './debono-hats'

export interface GrabSegment {
  type: 'grab'
  componentName: string
  filePath: string | null
  lineNumber: number | null
  displayName: string      // pill label, e.g. "CanonicalCard:128"
  elementTag: string       // "div", "button", etc.
}

export type AnnotationSegment =
  | { type: 'text'; value: string }
  | GrabSegment

export interface ArenaAnnotation {
  id: string
  hatKey: DebonoHatKey
  segments: AnnotationSegment[]
  timestamp: number
}

export interface SkillDecision {
  id: string
  label: string
  value: string
  rationale: string
  confidence: 'low' | 'medium' | 'high'
  source: string
}

export interface SkillRule {
  id: string
  statement: string
  type: 'must' | 'should' | 'must-not' | 'prefer'
  source: string
}

export interface DimensionState {
  decisions: SkillDecision[]
  rules: SkillRule[]
}

/** Open-ended skill state: dimension name → dimension state */
export type SkillState = Record<string, DimensionState>

/** Per-dimension skill state — what's stored in DB for dimension-scoped skills */
export type DimensionSkillState = DimensionState

/** Skill dimension is now an open string (not restricted to 3) */
export type SkillDimension = string

/** The three core dimensions (used as defaults; not authoritative — project config is) */
export const CORE_DIMENSIONS: string[] = ['color', 'typography', 'spacing']

/** @deprecated Use CORE_DIMENSIONS instead */
export const SKILL_DIMENSIONS = CORE_DIMENSIONS

/** Skill tier replaces the old source field */
export type SkillTier = 'template' | 'project' | 'refined'

/** Per-dimension scope configuration */
export interface DimensionConfig {
  scope: 'basic' | 'advanced'
}

/** Project configuration: which dimensions are active and at what scope */
export interface ProjectConfig {
  dimensions: Record<string, DimensionConfig>
}

/** A gap detected during foundation generation */
export interface FoundationGap {
  dimension: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

/** Foundation brief generated from substrate + inputs */
export interface FoundationBrief {
  intent: string[]
  gaps: FoundationGap[]
  generated_at: string
}

/** Compose per-dimension skills into a full SkillState (identity for Records) */
export function assembleSkillState(
  skills: Record<string, DimensionState>
): SkillState {
  return { ...skills }
}

/** Decision labels that must match the canonical components */
export const DECISION_LABELS = {
  color: ['Primary', 'Accent', 'Background', 'Text', 'Muted', 'Border'],
  typography: [
    'Display Font', 'Body Font', 'Mono Font',
    'Heading Size', 'Body Size', 'Small Size',
    'Heading Weight', 'Body Weight',
  ],
  spacing: ['Padding', 'Gap', 'Border Radius'],
} as const

/** Returns a SkillState with empty entries for the 3 core dimensions */
export function emptySkillState(): SkillState {
  return {
    color: { decisions: [], rules: [] },
    typography: { decisions: [], rules: [] },
    spacing: { decisions: [], rules: [] },
  }
}
