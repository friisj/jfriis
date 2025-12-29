interface StatusBadgeProps {
  value: string
  variant?: 'default' | 'subtle'
  colorMap?: Record<string, string>
}

const defaultColorMap: Record<string, string> = {
  // Project/Studio statuses
  draft: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  archived: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  completed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  paused: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',

  // Backlog statuses
  inbox: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shaped: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',

  // Log entry types
  experiment: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  idea: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  research: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  update: 'bg-green-500/10 text-green-700 dark:text-green-400',
}

export function StatusBadge({ value, variant = 'default', colorMap }: StatusBadgeProps) {
  const colors = colorMap || defaultColorMap
  const colorClass = colors[value.toLowerCase()] || colors.draft

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {value}
    </span>
  )
}
