'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormActionsProps {
  isSubmitting: boolean
  submitLabel?: string
  submitLoadingLabel?: string
  onCancel: () => void
  onDelete?: () => void
  deleteLabel?: string
  deleteConfirmMessage?: string
  /** When true, shows a sticky bar at the bottom of the viewport */
  sticky?: boolean
  /** When true + sticky, the bar is visible. Use to hide when no changes. */
  isDirty?: boolean
}

export function FormActions({
  isSubmitting,
  submitLabel = 'Save',
  submitLoadingLabel = 'Saving...',
  onCancel,
  onDelete,
  deleteLabel = 'Delete',
  deleteConfirmMessage = 'Are you sure you want to delete this? This action cannot be undone.',
  sticky = false,
  isDirty = true,
}: FormActionsProps) {
  const handleDelete = () => {
    if (confirm(deleteConfirmMessage)) {
      onDelete?.()
    }
  }

  // In sticky mode, hide when not dirty
  if (sticky && !isDirty && !isSubmitting) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between pt-6 border-t',
        sticky && 'fixed bottom-0 left-0 right-0 bg-background border-t p-4 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]'
      )}
    >
      <div>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            {deleteLabel}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {submitLoadingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  )
}
