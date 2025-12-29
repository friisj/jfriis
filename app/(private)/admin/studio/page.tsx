export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import {
  AdminListLayout,
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface StudioProject {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  temperature: string | null
  current_focus: string | null
  scaffolded_at: string | null
  created_at: string
  updated_at: string
}

const temperatureEmoji: Record<string, string> = {
  hot: '🔥',
  warm: '🌡️',
  cold: '❄️',
}

export default async function AdminStudioPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select(`
      id,
      slug,
      name,
      description,
      status,
      temperature,
      current_focus,
      scaffolded_at,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching studio projects:', error)
    return <div className="p-8">Error loading studio projects</div>
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
      key: 'scaffolded',
      header: 'Scaffolded',
      cell: (project) =>
        project.scaffolded_at ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Yes
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">No</span>
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
        <div className="space-x-2">
          <Link
            href={`/admin/studio/${project.id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
          >
            Edit
          </Link>
          {project.scaffolded_at && (
            <Link
              href={`/studio/${project.slug}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
            >
              View
            </Link>
          )}
        </div>
      ),
    },
  ]

  return (
    <AdminListLayout
      title="Studio Projects"
      description="Workshop projects with hypothesis-driven roadmaps"
      actionHref="/admin/studio/new"
      actionLabel="New Project"
    >
      {projects && projects.length > 0 ? (
        <AdminTable columns={columns} data={projects} />
      ) : (
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
      )}
    </AdminListLayout>
  )
}
