'use client'

import { useOptimistic, useTransition } from 'react'
import { updateExperimentStatus } from '@/app/actions/studio'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ExperimentStatus = 'planned' | 'in_progress' | 'completed' | 'abandoned'

const statusConfig: Record<ExperimentStatus, { label: string; color: string; bg: string }> = {
  planned: { label: 'planned', color: 'text-gray-400', bg: 'bg-gray-100' },
  in_progress: { label: 'in progress', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: 'completed', color: 'text-green-600', bg: 'bg-green-100' },
  abandoned: { label: 'abandoned', color: 'text-red-600', bg: 'bg-red-100' },
}

interface ExperimentStatusSelectProps {
  experimentId: string
  status: ExperimentStatus
  className?: string
}

export function ExperimentStatusSelect({
  experimentId,
  status,
  className,
}: ExperimentStatusSelectProps) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(status)
  const [, startTransition] = useTransition()

  const config = statusConfig[optimisticStatus] ?? statusConfig.planned

  function handleSelect(newStatus: ExperimentStatus) {
    startTransition(async () => {
      setOptimisticStatus(newStatus)
      await updateExperimentStatus(experimentId, newStatus)
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`text-sm font-medium px-2 py-0.5 rounded cursor-pointer hover:ring-1 hover:ring-gray-300 transition-shadow ${config.color} ${config.bg} ${className ?? ''}`}
        onClick={(e) => e.preventDefault()}
      >
        {config.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.entries(statusConfig) as [ExperimentStatus, typeof config][]).map(
          ([value, cfg]) => (
            <DropdownMenuItem
              key={value}
              onSelect={() => handleSelect(value)}
              className={value === optimisticStatus ? 'font-bold' : ''}
            >
              <span className={`size-2 rounded-full ${cfg.bg} ${cfg.color}`} />
              {cfg.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
