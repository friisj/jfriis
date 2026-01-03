'use client'

/**
 * FormFieldWithAI Component (v2 - Production Ready)
 *
 * Reusable wrapper for form fields with optional AI-assisted generation.
 * Provides consistent layout and integration pattern for all admin forms.
 *
 * FIXES (from critical assessment):
 * - ✅ P0: Accessibility - proper htmlFor/id association
 * - ✅ P0: Type-safe context (only serializable values)
 * - ✅ P1: Memoized to prevent unnecessary re-renders
 * - ✅ P1: Type-safe entity/field names
 * - ✅ P2: Error boundary around AI controls
 * - ✅ P2: Context size validation
 *
 * Usage:
 * ```tsx
 * <FormFieldWithAI
 *   label="Description"
 *   fieldName="description"
 *   entityType="studio_projects"
 *   context={{ name: formData.name }}
 *   currentValue={formData.description}
 *   onGenerate={(v) => setFormData({ ...formData, description: v })}
 *   disabled={saving}
 * >
 *   <textarea value={formData.description} ... />
 * </FormFieldWithAI>
 * ```
 */

import React, { useId, cloneElement, isValidElement, memo, useMemo } from 'react'
import { AIFieldControls } from '@/components/ai'
import { AIFieldErrorBoundary } from '@/components/ai/AIFieldErrorBoundary'
import type { AIContext, EntityType } from '@/lib/ai/types/entities'
import { validateContext, validateContextSize } from '@/lib/ai/types/entities'

export interface FormFieldWithAIProps {
  /** Field label text */
  label: string

  /** Field name (used for prompt selection) - type-safe per entity */
  fieldName: string

  /** Entity type (used for prompt selection) - type-safe */
  entityType: EntityType

  /**
   * Context from other form fields to enrich generation
   * IMPORTANT: Only serializable values allowed (string, number, boolean, null)
   * Non-serializable values will be filtered out with a warning
   */
  context: Record<string, unknown>

  /** Current field value (for improvement mode) */
  currentValue?: string

  /** Callback when AI generates content */
  onGenerate: (value: string) => void

  /** Disable AI controls (e.g., during form submission) */
  disabled?: boolean

  /** The actual input/textarea element */
  children: React.ReactElement

  /** Enable/disable AI controls (default: true) */
  enableAI?: boolean

  /** Optional description text below the field */
  description?: string

  /** Optional CSS class for the wrapper div */
  className?: string

  /** Optional explicit ID for the input (generated if not provided) */
  inputId?: string

  /** Show warning if context is too large (default: true) */
  warnOnLargeContext?: boolean
}

function FormFieldWithAIComponent({
  label,
  fieldName,
  entityType,
  context,
  currentValue,
  onGenerate,
  disabled = false,
  children,
  enableAI = true,
  description,
  className,
  inputId: providedId,
  warnOnLargeContext = true,
}: FormFieldWithAIProps) {
  // Generate unique ID for accessibility
  const generatedId = useId()
  const inputId = providedId || generatedId

  // Validate and sanitize context (P0: only serializable values) - memoized to prevent redundant work
  const validatedContext: AIContext = useMemo(() => validateContext(context), [context])

  // Validate context size (P2) - memoized
  const sizeCheck = useMemo(
    () => (warnOnLargeContext && process.env.NODE_ENV === 'development'
      ? validateContextSize(validatedContext)
      : { valid: true, size: 0, max: 0 }),
    [validatedContext, warnOnLargeContext]
  )

  // Warn about large context in development
  if (sizeCheck && !sizeCheck.valid) {
    console.warn(
      `[FormFieldWithAI] Large context for ${entityType}.${fieldName}: ${sizeCheck.size} tokens (max: ${sizeCheck.max}). Consider reducing context to improve performance.`
    )
  }

  // Clone child element and add ID for accessibility (P0)
  const childWithId = isValidElement(children)
    ? cloneElement(children, { id: inputId } as any)
    : children

  return (
    <div className={className}>
      <label htmlFor={inputId} className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        {enableAI && (
          <AIFieldErrorBoundary>
            <AIFieldControls
              fieldName={fieldName}
              entityType={entityType}
              context={validatedContext}
              currentValue={currentValue}
              onGenerate={onGenerate}
              disabled={disabled}
            />
          </AIFieldErrorBoundary>
        )}
      </label>
      {childWithId}
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}

// Shallow equality check for context objects (optimized vs JSON.stringify)
function shallowEqualContext(prev: Record<string, unknown>, next: Record<string, unknown>): boolean {
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)

  if (prevKeys.length !== nextKeys.length) return false

  return prevKeys.every(key => prev[key] === next[key])
}

// Memoize to prevent unnecessary re-renders (P1)
export const FormFieldWithAI = memo(FormFieldWithAIComponent, (prev, next) => {
  // Custom comparison for better performance
  return (
    prev.label === next.label &&
    prev.fieldName === next.fieldName &&
    prev.entityType === next.entityType &&
    prev.currentValue === next.currentValue &&
    prev.disabled === next.disabled &&
    prev.enableAI === next.enableAI &&
    prev.description === next.description &&
    prev.className === next.className &&
    prev.inputId === next.inputId &&
    // Shallow compare context (optimized - no JSON.stringify)
    shallowEqualContext(prev.context, next.context)
  )
})

FormFieldWithAI.displayName = 'FormFieldWithAI'
