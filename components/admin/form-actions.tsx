'use client'

interface FormActionsProps {
  isSubmitting: boolean
  submitLabel?: string
  submitLoadingLabel?: string
  onCancel: () => void
  onDelete?: () => void
  deleteLabel?: string
  deleteConfirmMessage?: string
}

export function FormActions({
  isSubmitting,
  submitLabel = 'Save',
  submitLoadingLabel = 'Saving...',
  onCancel,
  onDelete,
  deleteLabel = 'Delete',
  deleteConfirmMessage = 'Are you sure you want to delete this? This action cannot be undone.',
}: FormActionsProps) {
  const handleDelete = () => {
    if (confirm(deleteConfirmMessage)) {
      onDelete?.()
    }
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t">
      <div>
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {deleteLabel}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? submitLoadingLabel : submitLabel}
        </button>
      </div>
    </div>
  )
}
