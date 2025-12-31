/**
 * Centralized status color configuration
 * Used across all admin components for consistent theming
 */

export const STATUS_COLORS = {
  // Boundary object status
  draft: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  active: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  archived: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',

  // Validation status
  untested: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  testing: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  invalidated: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',

  // Pain levels
  none: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  minor: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  moderate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  major: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  critical: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',

  // Importance
  low: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  // critical already defined in pain levels
} as const

export type StatusColorKey = keyof typeof STATUS_COLORS

/**
 * Get color classes for a status value
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status as StatusColorKey] || STATUS_COLORS.draft
}

/**
 * Journey type display labels
 */
export const JOURNEY_TYPE_LABELS = {
  end_to_end: 'End-to-End',
  sub_journey: 'Sub-Journey',
  micro_moment: 'Micro-Moment',
} as const

/**
 * Status display labels
 */
export const STATUS_LABELS = {
  draft: 'Draft',
  active: 'Active',
  validated: 'Validated',
  archived: 'Archived',
} as const

/**
 * Validation status display labels
 */
export const VALIDATION_STATUS_LABELS = {
  untested: 'Untested',
  testing: 'Testing',
  validated: 'Validated',
  invalidated: 'Invalidated',
} as const

/**
 * Pain level display labels
 */
export const PAIN_LEVEL_LABELS = {
  none: 'None',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  critical: 'Critical',
} as const

/**
 * Importance display labels
 */
export const IMPORTANCE_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
} as const
