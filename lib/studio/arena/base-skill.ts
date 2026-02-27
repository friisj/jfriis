/**
 * Arena Base Skill
 *
 * The neutral default skill used as a baseline for canonical component comparison.
 */

import type { SkillState } from './types'

export const BASE_SKILL: SkillState = {
  color: {
    decisions: [
      { id: 'base-c1', label: 'Primary', value: '#3B82F6', rationale: 'Standard blue', confidence: 'high', source: 'base' },
      { id: 'base-c2', label: 'Accent', value: '#8B5CF6', rationale: 'Purple accent', confidence: 'high', source: 'base' },
      { id: 'base-c3', label: 'Background', value: '#FFFFFF', rationale: 'White background', confidence: 'high', source: 'base' },
      { id: 'base-c4', label: 'Text', value: '#1F2937', rationale: 'Dark gray text', confidence: 'high', source: 'base' },
      { id: 'base-c5', label: 'Muted', value: '#6B7280', rationale: 'Gray for secondary text', confidence: 'high', source: 'base' },
      { id: 'base-c6', label: 'Border', value: '#E5E7EB', rationale: 'Light gray border', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
  typography: {
    decisions: [
      { id: 'base-t1', label: 'Display Font', value: 'system-ui, sans-serif', rationale: 'System default for headings', confidence: 'high', source: 'base' },
      { id: 'base-t2', label: 'Body Font', value: 'system-ui, sans-serif', rationale: 'System default for body', confidence: 'high', source: 'base' },
      { id: 'base-t2m', label: 'Mono Font', value: 'ui-monospace, monospace', rationale: 'System monospace for data', confidence: 'high', source: 'base' },
      { id: 'base-t3', label: 'Heading Size', value: '18px', rationale: 'Standard heading', confidence: 'high', source: 'base' },
      { id: 'base-t4', label: 'Body Size', value: '14px', rationale: 'Standard body', confidence: 'high', source: 'base' },
      { id: 'base-t5', label: 'Small Size', value: '12px', rationale: 'Standard small', confidence: 'high', source: 'base' },
      { id: 'base-t6', label: 'Heading Weight', value: '600', rationale: 'Semibold headings', confidence: 'high', source: 'base' },
      { id: 'base-t7', label: 'Body Weight', value: '400', rationale: 'Normal body weight', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
  spacing: {
    decisions: [
      { id: 'base-s1', label: 'Padding', value: '16px', rationale: 'Standard padding', confidence: 'high', source: 'base' },
      { id: 'base-s2', label: 'Gap', value: '12px', rationale: 'Standard gap', confidence: 'high', source: 'base' },
      { id: 'base-s3', label: 'Border Radius', value: '8px', rationale: 'Standard radius', confidence: 'high', source: 'base' },
    ],
    rules: [],
  },
}
