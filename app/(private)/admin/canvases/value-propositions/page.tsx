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

interface ValuePropositionCanvas {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  fit_score: number | null
  studio_project_id: string | null
  customer_profile_id: string | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
  customer_profile?: { name: string } | null
}

export default async function AdminValuePropositionsPage() {
  const supabase = await createClient()

  const { data: canvases, error } = await supabase
    .from('value_proposition_canvases')
    .select(`
      id,
      slug,
      name,
      description,
      status,
      fit_score,
      studio_project_id,
      customer_profile_id,
      created_at,
      updated_at,
      studio_project:studio_projects(name),
      customer_profile:customer_profiles(name)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching value proposition canvases:', error)
    return <div className="p-8">Error loading value proposition canvases</div>
  }

  const columns: AdminTableColumn<ValuePropositionCanvas>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (canvas) => (
        <div className="flex flex-col">
          <span className="font-medium">{canvas.name}</span>
          <span className="text-sm text-muted-foreground">/{canvas.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (canvas) => <StatusBadge value={canvas.status} />,
    },
    {
      key: 'fit',
      header: 'Fit',
      align: 'center',
      cell: (canvas) =>
        canvas.fit_score !== null ? (
          <span
            className={`text-sm font-medium ${
              canvas.fit_score >= 0.7
                ? 'text-green-600 dark:text-green-400'
                : canvas.fit_score >= 0.4
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {Math.round(canvas.fit_score * 100)}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'profile',
      header: 'Customer',
      cell: (canvas) => (
        <span className="text-sm text-muted-foreground">{canvas.customer_profile?.name || '-'}</span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (canvas) => (
        <span className="text-sm text-muted-foreground">{canvas.studio_project?.name || '-'}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (canvas) => (
        <span className="text-sm text-muted-foreground">{formatDate(canvas.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (canvas) => (
        <Link
          href={`/admin/canvases/value-propositions/${canvas.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminListLayout
      title="Value Proposition Canvases"
      description="Product-market fit mapping"
      actionHref="/admin/canvases/value-propositions/new"
      actionLabel="New Canvas"
    >
      {canvases && canvases.length > 0 ? (
        <AdminTable columns={columns} data={canvases} />
      ) : (
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
          title="No value proposition canvases yet"
          description="Create your first canvas to map product-market fit"
          actionHref="/admin/canvases/value-propositions/new"
          actionLabel="New Canvas"
        />
      )}
    </AdminListLayout>
  )
}
