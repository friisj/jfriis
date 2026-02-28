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

export interface SkillState {
  color: DimensionState
  typography: DimensionState
  spacing: DimensionState
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

export function emptySkillState(): SkillState {
  return {
    color: { decisions: [], rules: [] },
    typography: { decisions: [], rules: [] },
    spacing: { decisions: [], rules: [] },
  }
}
