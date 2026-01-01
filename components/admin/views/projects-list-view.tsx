'use client'

import Link from 'next/link'
import {
  AdminDataView,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { ProjectCard } from '@/components/admin/cards'
import { formatDate } from '@/lib/utils'

interface Project {
  id: string
  title: string
  slug: string
  status: string
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
  project_specimens?: Array<{ count: number }>
  log_entry_projects?: Array<{ count: number }>
}

interface ProjectsListViewProps {
  projects: Project[]
}

export function ProjectsListView({ projects }: ProjectsListViewProps) {
  const columns: AdminTableColumn<Project>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (project) => (
        <div className="flex flex-col">
          <span className="font-medium">{project.title}</span>
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
      key: 'type',
      header: 'Type',
      cell: (project) => <span className="text-sm">{project.type || '-'}</span>,
    },
    {
      key: 'links',
      header: 'Links',
      cell: (project) => (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{project.project_specimens?.[0]?.count || 0} specimens</span>
          <span>{project.log_entry_projects?.[0]?.count || 0} log entries</span>
        </div>
      ),
    },
    {
      key: 'published',
      header: 'Published',
      cell: (project) =>
        project.published ? (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
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
        <Link
          href={`/admin/projects/${project.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminDataView
      data={projects}
      views={{
        table: {
          columns,
        },
        grid: {
          renderCard: (project) => <ProjectCard project={project} />,
        },
      }}
      defaultView="table"
      persistenceKey="admin-projects-view"
      emptyState={
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          title="No projects yet"
          description="Get started by creating your first portfolio project"
          actionHref="/admin/projects/new"
          actionLabel="Create Project"
        />
      }
    />
  )
}
