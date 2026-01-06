'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface StudioProject {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  temperature: string | null
  current_focus: string | null
  created_at: string
  updated_at: string
}

interface StudioProjectCardProps {
  project: StudioProject
}

const temperatureEmoji: Record<string, string> = {
  hot: '🔥',
  warm: '🌡️',
  cold: '❄️',
}


export function StudioProjectCard({ project }: StudioProjectCardProps) {
  return (
    <Link
      href={`/admin/studio/${project.id}/edit`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all duration-200"
    >
      <div className="flex flex-col gap-3">
        {/* Title and slug */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{project.name}</h3>
          <p className="text-sm text-muted-foreground truncate">/{project.slug}</p>
        </div>

        {/* Description */}
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Status and temperature */}
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge value={project.status} />
          {project.temperature && (
            <span title={project.temperature} className="text-lg">
              {temperatureEmoji[project.temperature]}
            </span>
          )}
        </div>

        {/* Current focus */}
        {project.current_focus && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Focus:</span> {project.current_focus}
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
          <span>{formatDate(project.updated_at)}</span>
          <Link
            href={`/studio/${project.slug}`}
            className="text-primary hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View →
          </Link>
        </div>
      </div>
    </Link>
  )
}
