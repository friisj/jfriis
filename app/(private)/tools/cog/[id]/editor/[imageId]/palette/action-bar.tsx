'use client'

interface ActionBarProps {
  primaryLabel: string
  loadingLabel: string
  onPrimary: () => void
  onClear: () => void
  isPrimaryDisabled: boolean
  isClearDisabled: boolean
  isLoading: boolean
}

export function ActionBar({
  primaryLabel,
  loadingLabel,
  onPrimary,
  onClear,
  isPrimaryDisabled,
  isClearDisabled,
  isLoading,
}: ActionBarProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onClear}
        disabled={isClearDisabled || isLoading}
        className="px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Clear
      </button>
      <button
        onClick={onPrimary}
        disabled={isPrimaryDisabled || isLoading}
        className="flex-1 px-4 py-2 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isLoading ? loadingLabel : primaryLabel}
      </button>
    </div>
  )
}
