/**
 * Shared types for admin components
 */

/**
 * Available view types for admin data visualization
 */
export type ViewType = 'table' | 'grid' | 'kanban' | 'canvas'

/**
 * Valid view types as a readonly array for validation
 */
export const VIEW_TYPES: readonly ViewType[] = ['table', 'grid', 'kanban', 'canvas'] as const

/**
 * Type guard to check if a value is a valid ViewType
 */
export function isViewType(value: unknown): value is ViewType {
  return typeof value === 'string' && (VIEW_TYPES as readonly string[]).includes(value)
}
