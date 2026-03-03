/**
 * Arena Base Skill
 *
 * The neutral default skill used as a baseline for canonical component comparison.
 * Decisions carry design intent (qualitative) only — NO token values.
 * Token values live in the theme layer (arena_themes table).
 */

import type { SkillState } from './types'
import type { TokenMap } from './types'

/** Base skill — purely qualitative design philosophy */
export const BASE_SKILL: SkillState = {
  color: {
    decisions: [
      {
        id: 'base-c1', label: 'Primary',
        rationale: 'Trustworthy anchor — accessible, not aggressive',
        intent: 'The primary action color should feel confident and approachable. Professional but not corporate.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c2', label: 'Accent',
        rationale: 'Distinct from primary, reserved for secondary emphasis',
        intent: 'Accent marks secondary actions and highlights. Should complement primary without competing for attention.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c3', label: 'Background',
        rationale: 'Clean canvas that lets content breathe',
        intent: 'Background should recede completely — content and UI elements are the focus, never the surface.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c4', label: 'Text',
        rationale: 'High contrast for readability without harsh pure black',
        intent: 'Body text must be effortlessly readable. Slightly warm dark gray avoids the clinical feel of pure black.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c5', label: 'Muted',
        rationale: 'De-emphasized text for metadata and secondary info',
        intent: 'Muted text communicates hierarchy — present but not demanding attention. Used for timestamps, labels, hints.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c6', label: 'Border',
        rationale: 'Subtle structural boundary, not a visual element',
        intent: 'Borders define structure without drawing the eye. They should almost disappear on light backgrounds.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-cr1', statement: 'Must meet WCAG AA contrast on all surface pairings', type: 'must', source: 'base' },
      { id: 'base-cr2', statement: 'Primary and accent should be distinguishable by colorblind users', type: 'should', source: 'base' },
    ],
  },
  typography: {
    decisions: [
      {
        id: 'base-t1', label: 'Display Font',
        rationale: 'System font for zero-latency heading rendering',
        intent: 'Display type sets the tone — should feel authoritative for headings without being decorative.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t2', label: 'Body Font',
        rationale: 'System font for optimal readability at body sizes',
        intent: 'Body text is read in volume. Prioritize comfort and rhythm over personality.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t2m', label: 'Mono Font',
        rationale: 'System monospace for data and code contexts',
        intent: 'Mono type signals precision — used for values, codes, and technical content where alignment matters.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t3', label: 'Heading Size',
        rationale: 'Clear hierarchy without overwhelming the layout',
        intent: 'Headings establish section boundaries. Size should create clear hierarchy without dominating compact layouts.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t4', label: 'Body Size',
        rationale: 'Comfortable reading size for dense UI content',
        intent: 'Body size must balance information density with readability. Optimized for UI text, not long-form prose.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t5', label: 'Small Size',
        rationale: 'Minimum readable size for labels and metadata',
        intent: 'Small text is functional — captions, timestamps, status indicators. Must remain legible at this floor.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t6', label: 'Heading Weight',
        rationale: 'Semibold creates distinction without heaviness',
        intent: 'Heading weight reinforces the size hierarchy. Should feel decisive without looking bold or aggressive.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t7', label: 'Body Weight',
        rationale: 'Normal weight for extended reading comfort',
        intent: 'Body weight should be invisible — normal enough that the reader focuses on content, not letterforms.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-tr1', statement: 'Display and body should feel like they belong to the same family, even if different faces', type: 'should', source: 'base' },
      { id: 'base-tr2', statement: 'Minimum body size must not drop below 12px for accessibility', type: 'must', source: 'base' },
    ],
  },
  spacing: {
    decisions: [
      {
        id: 'base-s1', label: 'Padding',
        rationale: 'Balanced breathing room inside containers',
        intent: 'Internal padding gives content room to breathe. Too tight feels cramped; too loose wastes space.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-s2', label: 'Gap',
        rationale: 'Consistent rhythm between sibling elements',
        intent: 'Gap creates visual rhythm between elements. Should feel consistent across all component groupings.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-s3', label: 'Border Radius',
        rationale: 'Friendly rounding that avoids both sharp and bubbly extremes',
        intent: 'Radius sets the personality — gentle rounding feels modern and approachable without being playful.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-sr1', statement: 'Consistent rhythm — padding and gap should share a common base unit', type: 'should', source: 'base' },
      { id: 'base-sr2', statement: 'Border radius should never exceed half the smallest dimension of the element', type: 'must-not', source: 'base' },
    ],
  },
}

/** Default token values for the base skill — used to seed template theme configs */
export const BASE_THEME_TOKENS: Record<string, TokenMap> = {
  color: {
    'Primary': '#3B82F6',
    'Accent': '#8B5CF6',
    'Background': '#FFFFFF',
    'Text': '#1F2937',
    'Muted': '#6B7280',
    'Border': '#E5E7EB',
  },
  typography: {
    'Display Font': 'system-ui, sans-serif',
    'Body Font': 'system-ui, sans-serif',
    'Mono Font': 'ui-monospace, monospace',
    'Heading Size': '18px',
    'Body Size': '14px',
    'Small Size': '12px',
    'Heading Weight': '600',
    'Body Weight': '400',
  },
  spacing: {
    'Padding': '16px',
    'Gap': '12px',
    'Border Radius': '8px',
  },
}
