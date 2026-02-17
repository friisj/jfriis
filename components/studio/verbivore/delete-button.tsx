'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
  onDelete: () => Promise<void>
  entityName: string
  redirectTo?: string
}

export function DeleteButton({ onDelete, entityName, redirectTo }: DeleteButtonProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
      if (redirectTo) {
        router.push(redirectTo)
        router.refresh()
      }
    } catch (error) {
      console.error(`Error deleting ${entityName}:`, error)
      alert(`Failed to delete ${entityName}. Please try again.`)
    } finally {
      setIsDeleting(false)
      setIsConfirming(false)
    }
  }

  if (isConfirming) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-red-600 dark:text-red-400">Delete {entityName}?</span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
        >
          {isDeleting ? 'Deleting...' : 'Confirm'}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          className="px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
    >
      Delete
    </button>
  )
}
