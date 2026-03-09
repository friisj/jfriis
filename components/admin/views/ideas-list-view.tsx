'use client'

import Link from 'next/link'
import { useState } from 'react'
import { IconChevronRight, IconBulb } from '@tabler/icons-react'
import {
  AdminDataView,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { IdeaCard } from '@/components/admin/cards/idea-card'
import { GraduationModal } from '@/components/admin/graduation-modal'
import { formatDate } from '@/lib/utils'
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode'
import type { IdeaStage } from '@/lib/types/database'
import type { KanbanGroup } from '@/components/admin'

interface LinkedEntity {
  id: string
  name: string
}

export interface IdeaEntry {
  id: string
  title: string
  slug: string
  content?: any
  entry_date: string
  type: string | null
  idea_stage: IdeaStage
  published: boolean
  is_private?: boolean | null
  tags?: string[]
  created_at: string
  updated_at: string
  linkedStudioProjects: LinkedEntity[]
  linkedVentures: LinkedEntity[]
}

interface IdeasListViewProps {
  ideas: IdeaEntry[]
  stageCounts: Record<string, number>
}

const STAGE_COLOR_MAP: Record<string, string> = {
  captured: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  exploring: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  validated: 'bg-green-500/10 text-green-700 dark:text-green-400',
  graduated: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  parked: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
}

const KANBAN_GROUPS: KanbanGroup[] = [
  { id: 'captured', label: 'Captured', color: 'bg-amber-500' },
  { id: 'exploring', label: 'Exploring', color: 'bg-blue-500' },
  { id: 'validated', label: 'Validated', color: 'bg-green-500' },
  { id: 'graduated', label: 'Graduated', color: 'bg-purple-500' },
  { id: 'parked', label: 'Parked', color: 'bg-gray-500' },
]

export function IdeasListView({ ideas, stageCounts }: IdeasListViewProps) {
  const { isPrivacyMode } = usePrivacyMode()
  const [graduationTarget, setGraduationTarget] = useState<IdeaEntry | null>(null)
  const [graduationType, setGraduationType] = useState<'studio_project' | 'venture'>('studio_project')
  const [stageFilter, setStageFilter] = useState<string | null>(null)

  const visibleIdeas = filterPrivateRecords(ideas, isPrivacyMode)
  const filteredIdeas = stageFilter
    ? visibleIdeas.filter(i => i.idea_stage === stageFilter)
    : visibleIdeas

  const columns: AdminTableColumn<IdeaEntry>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (idea) => (
        <div className="flex flex-col">
          <span className="font-medium">{idea.title}</span>
          {idea.tags && idea.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {idea.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (idea) => (
        <StatusBadge value={idea.idea_stage} colorMap={STAGE_COLOR_MAP} />
      ),
    },
    {
      key: 'linked',
      header: 'Linked To',
      cell: (idea) => (
        <div className="flex flex-col gap-1">
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
          {idea.linkedStudioProjects.length === 0 && idea.linkedVentures.length === 0 && (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (idea) => <span className="text-sm">{formatDate(idea.entry_date)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (idea) => (
        <div className="flex items-center gap-2 justify-end">
          {idea.idea_stage !== 'graduated' && idea.idea_stage !== 'parked' && (
            <button
              onClick={(e) => {
                e.preventDefault()
                setGraduationType(
                  idea.linkedStudioProjects.length > 0 ? 'venture' : 'studio_project'
                )
                setGraduationTarget(idea)
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            >
              Graduate
            </button>
          )}
          <Link
            href={`/admin/log/${idea.id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ]

  const handleKanbanMove = async (item: IdeaEntry, _fromGroup: string, toGroup: string) => {
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase
      .from('log_entries')
      .update({ idea_stage: toGroup })
      .eq('id', item.id)

    if (error) throw error

    // Optimistic: update in-memory (page will revalidate on next nav)
    item.idea_stage = toGroup as IdeaStage
  }

  return (
    <div>
      {/* Pipeline summary */}
      <div className="flex items-center gap-1 mb-6 flex-wrap">
        {KANBAN_GROUPS.map((group, i) => {
          const count = stageCounts[group.id] || 0
          const isActive = stageFilter === group.id
          const isParked = group.id === 'parked'
          return (
            <div key={group.id} className="flex items-center">
              {isParked && <span className="text-muted-foreground mx-2">|</span>}
              {!isParked && i > 0 && (
                <IconChevronRight size={16} className="text-muted-foreground mx-1" />
              )}
              <button
                onClick={() => setStageFilter(isActive ? null : group.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                }`}
              >
                {count} {group.label}
              </button>
            </div>
          )
        })}
        {stageFilter && (
          <button
            onClick={() => setStageFilter(null)}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      <AdminDataView
        data={filteredIdeas}
        views={{
          table: {
            columns,
          },
          kanban: {
            groupBy: 'idea_stage' as keyof IdeaEntry,
            groups: KANBAN_GROUPS,
            renderCard: (idea) => <IdeaCard idea={idea} onGraduate={setGraduationTarget} />,
            onMove: handleKanbanMove,
          },
        }}
        defaultView="table"
        persistenceKey="admin-ideas-view"
        emptyState={
          <AdminEmptyState
            icon={
              <IconBulb size={32} className="text-muted-foreground" />
            }
            title="No ideas captured yet"
            description="Start capturing ideas to build your pipeline. Use the /idea-capture skill for quick capture."
            actionHref="/admin/log/new?type=idea"
            actionLabel="Capture Idea"
          />
        }
      />

      {/* Graduation modal */}
      {graduationTarget && (
        <GraduationModal
          idea={graduationTarget}
          targetType={graduationType}
          onClose={() => setGraduationTarget(null)}
        />
      )}
    </div>
  )
}
