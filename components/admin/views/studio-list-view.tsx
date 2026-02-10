'use client'

import Link from 'next/link'
import {
  AdminDataView,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
  KanbanGroup,
} from '@/components/admin'
import { StudioProjectCard } from '@/components/admin/cards'
import { formatDate } from '@/lib/utils'
import { updateStudioProjectStatus } from '@/app/actions/studio'
import { usePrivacyMode, filterPrivateRecords } from '@/lib/privacy-mode'


interface StudioProject {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  temperature: string | null
  current_focus: string | null
  is_private?: boolean | null
  created_at: string
  updated_at: string
}

interface StudioListViewProps {
  projects: StudioProject[]
}

const temperatureEmoji: Record<string, string> = {
  hot: '🔥',
  warm: '🌡️',
  cold: '❄️',
}

export function StudioListView({ projects }: StudioListViewProps) {
  const { isPrivacyMode } = usePrivacyMode()

  // Filter projects based on privacy mode
  const visibleProjects = filterPrivateRecords(projects, isPrivacyMode)

  const kanbanGroups: KanbanGroup[] = [
    { id: 'draft', label: 'Draft', color: 'bg-gray-500' },
    { id: 'active', label: 'Active', color: 'bg-blue-500' },
    { id: 'completed', label: 'Completed', color: 'bg-green-500' },
    { id: 'archived', label: 'Archived', color: 'bg-gray-400' },
  ]

  const handleKanbanMove = async (
    project: StudioProject,
    fromStatus: string,
    toStatus: string
  ) => {
    await updateStudioProjectStatus(project.id, toStatus)
  }

  const columns: AdminTableColumn<StudioProject>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (project) => (
        <div className="flex flex-col">
          <span className="font-medium">{project.name}</span>
          <span className="text-sm text-muted-foreground">/{project.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (project) => <StatusBadge value={project.status} />,
    },
    {
      key: 'temperature',
      header: 'Temp',
      align: 'center',
      cell: (project) =>
        project.temperature ? (
          <span title={project.temperature}>
            {temperatureEmoji[project.temperature]}
          </span>
        ) : (
          <span>-</span>
        ),
    },
    {
      key: 'focus',
      header: 'Focus',
      cell: (project) => (
        <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
          {project.current_focus || '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (project) => <span className="text-sm text-muted-foreground">{formatDate(project.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (project) => (
        <div className="flex items-center gap-2 justify-end">
          <Link
            href={`/admin/studio/${project.id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
          >
            Edit
          </Link>
          <Link
            href={`/studio/${project.slug}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
          >
            View
          </Link>
        </div>
      ),
    },
  ]

  return (
    <AdminDataView
      data={visibleProjects}
      views={{
        table: {
          columns,
        },
        grid: {
          renderCard: (project) => <StudioProjectCard project={project} />,
        },
        kanban: {
          groupBy: 'status',
          groups: kanbanGroups,
          renderCard: (project) => <StudioProjectCard project={project} />,
          onMove: handleKanbanMove,
        },
      }}
      defaultView="table"
      persistenceKey="admin-studio-view"
      emptyState={
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          }
          title="No studio projects yet"
          description="Capture your first idea to start building"
          actionHref="/admin/studio/new"
          actionLabel="New Project"
        />
      }
    />
  )
}
