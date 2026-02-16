'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/admin'
import { formatDate } from '@/lib/utils'
import type { IdeaEntry } from '@/components/admin/views/ideas-list-view'

const STAGE_COLOR_MAP: Record<string, string> = {
  captured: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  exploring: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  graduated: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  parked: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
}

interface IdeaCardProps {
  idea: IdeaEntry
  onGraduate?: (idea: IdeaEntry) => void
}

export function IdeaCard({ idea, onGraduate }: IdeaCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/admin/log/${idea.id}/edit`}
            className="font-semibold truncate hover:underline flex-1 min-w-0"
          >
            {idea.title}
          </Link>
          <StatusBadge value={idea.idea_stage} colorMap={STAGE_COLOR_MAP} />
        </div>

        <div className="text-sm text-muted-foreground">
          {formatDate(idea.entry_date)}
        </div>

        {/* Tags */}
        {idea.tags && idea.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {idea.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Linked entities */}
        {(idea.linkedStudioProjects.length > 0 || idea.linkedVentures.length > 0) && (
          <div className="flex flex-col gap-1 border-t pt-2">
            {idea.linkedStudioProjects.map(p => (
              <Link
                key={p.id}
                href={`/admin/studio/${p.id}/edit`}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Studio: {p.name}
              </Link>
            ))}
            {idea.linkedVentures.map(v => (
              <Link
                key={v.id}
                href={`/admin/ventures/${v.id}/edit`}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
              >
                Venture: {v.name}
              </Link>
            ))}
          </div>
        )}

        {/* Graduate action */}
        {idea.idea_stage !== 'graduated' && idea.idea_stage !== 'parked' && onGraduate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onGraduate(idea)
            }}
            className="text-xs text-green-700 dark:text-green-400 hover:underline text-left"
          >
            Graduate &rarr;
          </button>
        )}
      </div>
    </div>
  )
}
