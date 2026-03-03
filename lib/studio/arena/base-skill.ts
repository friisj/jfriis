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
        id: 'base-c2', label: 'Secondary',
        rationale: 'Complementary to primary, used for secondary UI elements',
        intent: 'Secondary color supports primary without competing. Used for secondary bars, alternate actions, supporting elements.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c2a', label: 'Accent',
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
        id: 'base-c3a', label: 'Card',
        rationale: 'Subtle surface elevation for panels and cards',
        intent: 'Card background distinguishes contained content from the page surface. Should be close to Background but perceptibly different.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c3b', label: 'Input',
        rationale: 'Clean surface for form inputs to stand out from card backgrounds',
        intent: 'Input background ensures form fields are clearly identifiable. Should contrast with Card and Background surfaces.',
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
      {
        id: 'base-c7', label: 'Destructive',
        rationale: 'Clear danger signal for errors and destructive actions',
        intent: 'Destructive red communicates errors, validation failures, and irreversible actions. Must be unmistakably negative.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-c8', label: 'Success',
        rationale: 'Positive signal for confirmations and upward trends',
        intent: 'Success green marks positive outcomes — growth deltas, confirmations, completed states. Should feel optimistic.',
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
      {
        id: 'base-t8', label: 'Line Height',
        rationale: 'Comfortable line spacing for body text readability',
        intent: 'Line height controls vertical rhythm of body text. 1.5 is the sweet spot for readability in UI contexts.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t9', label: 'Heading Line Height',
        rationale: 'Tighter line spacing for headings to feel cohesive',
        intent: 'Headings benefit from tighter leading — multi-line headings should feel like a single unit, not drifting apart.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t10', label: 'Letter Spacing',
        rationale: 'Default tracking for body text',
        intent: 'Body letter spacing should be neutral — let the typeface designer\'s spacing work as intended.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-t11', label: 'Heading Letter Spacing',
        rationale: 'Slight negative tracking for headings at larger sizes',
        intent: 'Large text looks looser than body text. Slight negative tracking tightens headings for a more polished feel.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-tr1', statement: 'Display and body should feel like they belong to the same family, even if different faces', type: 'should', source: 'base' },
      { id: 'base-tr2', statement: 'Minimum body size must not drop below 12px for accessibility', type: 'must', source: 'base' },
    ],
  },
  elevation: {
    decisions: [
      {
        id: 'base-e1', label: 'None',
        rationale: 'Flat elements with no shadow — flush with the surface',
        intent: 'No shadow means the element sits on the surface plane. Used for inline or flush elements.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-e2', label: 'Low',
        rationale: 'Subtle lift for cards and panels',
        intent: 'Low elevation gives elements a gentle lift — enough to separate from background without creating visual weight.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-e3', label: 'Medium',
        rationale: 'Moderate lift for interactive or focused elements',
        intent: 'Medium elevation communicates interactivity or focus. Dropdowns, popovers, and active panels use this level.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-e4', label: 'High',
        rationale: 'Strong lift for modals and overlays',
        intent: 'High elevation indicates elements floating above the interface. Modals, dialogs, and toasts use this level.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-er1', statement: 'Higher elevation should correlate with higher z-index and visual importance', type: 'should', source: 'base' },
    ],
  },
  radius: {
    decisions: [
      {
        id: 'base-r1', label: 'Small',
        rationale: 'Minimal rounding for nested or compact elements',
        intent: 'Small radius gives a subtle softness to small elements — badges, chips, and inner containers.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-r2', label: 'Medium',
        rationale: 'Standard rounding for buttons, inputs, and cards',
        intent: 'Medium radius is the workhorse — balanced rounding that feels modern without being bubbly.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-r3', label: 'Large',
        rationale: 'Pronounced rounding for cards and containers',
        intent: 'Large radius creates a softer, more approachable feel for primary containers and hero elements.',
        confidence: 'high', source: 'base',
      },
      {
        id: 'base-r4', label: 'Full',
        rationale: 'Fully rounded for pills and circular elements',
        intent: 'Full radius creates pill shapes and circles. Used for tags, avatars, and toggle indicators.',
        confidence: 'high', source: 'base',
      },
    ],
    rules: [
      { id: 'base-rr1', statement: 'Radius should scale with element size — larger elements get larger radius', type: 'should', source: 'base' },
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
    'Secondary': '#6366F1',
    'Accent': '#8B5CF6',
    'Background': '#FFFFFF',
    'Card': '#F9FAFB',
    'Input': '#FFFFFF',
    'Text': '#1F2937',
    'Muted': '#6B7280',
    'Border': '#E5E7EB',
    'Destructive': '#EF4444',
    'Success': '#22C55E',
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
    'Line Height': '1.5',
    'Heading Line Height': '1.2',
    'Letter Spacing': '0em',
    'Heading Letter Spacing': '-0.02em',
  },
  elevation: {
    'None': 'none',
    'Low': '0 1px 3px rgba(0,0,0,0.08)',
    'Medium': '0 4px 12px rgba(0,0,0,0.1)',
    'High': '0 8px 24px rgba(0,0,0,0.15)',
  },
  radius: {
    'Small': '4px',
    'Medium': '8px',
    'Large': '12px',
    'Full': '9999px',
  },
  spacing: {
    'Padding': '16px',
    'Gap': '12px',
    'Border Radius': '8px',
  },
}
