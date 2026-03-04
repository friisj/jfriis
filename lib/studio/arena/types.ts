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
  value?: string
  rationale: string
  intent?: string
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

/** Token-bearing dimensions — default checked when creating new projects */
export const CORE_DIMENSIONS: string[] = ['color', 'typography', 'spacing', 'elevation', 'radius']

/** All dimensions including qualitative/policy dimensions */
export const ALL_DIMENSIONS: string[] = [
  'color', 'typography', 'spacing', 'elevation', 'radius',
  'density', 'motion', 'iconography', 'voice', 'presentation',
]

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
  color: ['Primary', 'Secondary', 'Accent', 'Background', 'Card', 'Input', 'Text', 'Muted', 'Border', 'Destructive', 'Success'],
  typography: [
    'Display Font', 'Body Font', 'Mono Font',
    'Heading Size', 'Body Size', 'Small Size',
    'Heading Weight', 'Body Weight',
    'Line Height', 'Heading Line Height',
    'Letter Spacing', 'Heading Letter Spacing',
  ],
  spacing: ['Padding', 'Gap', 'Section Spacing', 'Stack Gap', 'Inline Spacing'],
  elevation: ['None', 'Low', 'Medium', 'High'],
  radius: ['Small', 'Medium', 'Large', 'Full'],
  density: ['Default Mode', 'Compact Mode', 'Spacious Mode', 'Density Scale Factor', 'Row Height', 'Touch Target Minimum'],
  motion: ['Micro Transitions', 'State Transitions', 'Entrance Animations', 'Exit Animations', 'Choreography', 'Easing Standard'],
  iconography: ['Stroke Weight', 'Size Grid', 'Corner Style', 'Optical Weight', 'Filled vs. Outlined', 'Metaphor Conventions'],
  voice: ['Formality Level', 'Error Tone', 'Empty State Tone', 'Button & Action Labels', 'Confirmation & Success Tone', 'Help & Guidance Tone'],
  presentation: ['Content-to-Chrome Ratio', 'Card vs. List Philosophy', 'Visual Weight Distribution', 'Progressive Disclosure', 'Chrome Style', 'Information Hierarchy Strategy'],
} as const

// =============================================================================
// Theme Layer Types
// =============================================================================

/** Flat label → value map for a single dimension's tokens */
export type TokenMap = Record<string, string>

/** A dimension's theme entry: tokens + provenance */
export interface DimensionTheme {
  tokens: TokenMap
  source: string
}

/** Full project theme: dimension name → DimensionTheme */
export type ProjectTheme = Record<string, DimensionTheme>

/**
 * Maps dimension names to the CSS/design token categories they govern.
 * Used for documentation and validation — not authoritative for rendering.
 */
export const DIMENSION_CONFIG_SECTIONS: Record<string, string[]> = {
  color: ['colors', 'backgroundColor', 'borderColor', 'textColor'],
  typography: ['fontFamily', 'fontSize', 'fontWeight'],
  spacing: ['padding', 'gap', 'borderRadius', 'margin'],
  elevation: ['boxShadow'],
  radius: ['borderRadius'],
}

/** Extract a flat TokenMap from a DimensionState's decisions (skips decisions without values) */
export function extractTokensFromDimension(state: DimensionState): TokenMap {
  const tokens: TokenMap = {}
  for (const d of state.decisions) {
    if (d.value != null) tokens[d.label] = d.value
  }
  return tokens
}

/**
 * Resolve render tokens from the theme layer.
 * Theme is the sole source of token values — skill decisions are qualitative only.
 * Returns empty TokenMap per dimension when no theme exists.
 */
export function resolveRenderTokens(
  skill: SkillState,
  theme?: ProjectTheme
): Record<string, TokenMap> {
  const result: Record<string, TokenMap> = {}
  for (const dim of Object.keys(skill)) {
    result[dim] = theme?.[dim]?.tokens ?? {}
  }
  return result
}

/** Returns a SkillState with empty entries for all dimensions */
export function emptySkillState(): SkillState {
  const state: SkillState = {}
  for (const dim of ALL_DIMENSIONS) {
    state[dim] = { decisions: [], rules: [] }
  }
  return state
}
