'use client'

/**
 * FormFieldWithAI Component
 *
 * Reusable wrapper for form fields with optional AI-assisted generation.
 * Provides consistent layout and integration pattern for all admin forms.
 *
 * Benefits:
 * - DRY: Single component for all AI-augmented fields
 * - Consistency: Same UX across all forms
 * - Maintainability: Changes propagate to all usages
 * - Flexibility: Easy to enable/disable AI per field
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

import { AIFieldControls } from '@/components/ai'

export interface FormFieldWithAIProps {
  /** Field label text */
  label: string

  /** Field name (used for prompt selection) */
  fieldName: string

  /** Entity type (used for prompt selection) */
  entityType: string

  /** Context from other form fields to enrich generation */
  context: Record<string, unknown>

  /** Current field value (for improvement mode) */
  currentValue?: string

  /** Callback when AI generates content */
  onGenerate: (value: string) => void

  /** Disable AI controls (e.g., during form submission) */
  disabled?: boolean

  /** The actual input/textarea element */
  children: React.ReactNode

  /** Enable/disable AI controls (default: true) */
  enableAI?: boolean

  /** Optional description text below the field */
  description?: string

  /** Optional CSS class for the wrapper div */
  className?: string
}

export function FormFieldWithAI({
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
}: FormFieldWithAIProps) {
  return (
    <div className={className}>
      <label className="flex items-center justify-between text-sm font-medium mb-1">
        <span>{label}</span>
        {enableAI && (
          <AIFieldControls
            fieldName={fieldName}
            entityType={entityType}
            context={context}
            currentValue={currentValue}
            onGenerate={onGenerate}
            disabled={disabled}
          />
        )}
      </label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
