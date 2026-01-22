'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  AdminListLayout,
  AdminTable,
  AdminTableColumn,
  AdminEmptyState,
  StatusBadge,
} from '@/components/admin'
import { formatDate } from '@/lib/utils'

interface BusinessModelCanvas {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  version: number
  studio_project_id: string | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
}

export default function AdminBusinessModelsPage() {
  const [canvases, setCanvases] = useState<BusinessModelCanvas[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('business_model_canvases')
        .select(`
          id,
          slug,
          name,
          description,
          status,
          version,
          studio_project_id,
          created_at,
          updated_at,
          studio_project:studio_projects(name)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching business model canvases:', error)
        setError('Error loading business model canvases')
      } else {
        setCanvases(data || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (error) {
    return <div className="p-8">{error}</div>
  }

  const columns: AdminTableColumn<BusinessModelCanvas>[] = [
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
      key: 'version',
      header: 'Ver',
      align: 'center',
      cell: (canvas) => (
        <span className="text-sm text-muted-foreground">v{canvas.version}</span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (canvas) => (
        <span className="text-sm text-muted-foreground">
          {canvas.studio_project?.name || '-'}
        </span>
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
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/canvases/business-models/${canvas.id}/canvas`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            Canvas
          </Link>
          <Link
            href={`/admin/canvases/business-models/${canvas.id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ]

  return (
    <AdminListLayout
      title="Business Model Canvases"
      description="9-block business model visualization"
      actionHref="/admin/canvases/business-models/new"
      actionLabel="New Canvas"
    >
      {canvases.length > 0 ? (
        <AdminTable columns={columns} data={canvases} />
      ) : (
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
          }
          title="No business model canvases yet"
          description="Create your first canvas to map out a business model"
          actionHref="/admin/canvases/business-models/new"
          actionLabel="New Canvas"
        />
      )}
    </AdminListLayout>
  )
}
