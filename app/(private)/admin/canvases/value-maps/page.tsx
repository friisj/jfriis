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

interface ValueMap {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  studio_project_id: string | null
  business_model_canvas_id: string | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
  business_model_canvas?: { name: string } | null
}

export default function AdminValueMapsPage() {
  const [valueMaps, setValueMaps] = useState<ValueMap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await (supabase
        .from('value_maps') as any)
        .select(`
          id,
          slug,
          name,
          description,
          status,
          studio_project_id,
          business_model_canvas_id,
          created_at,
          updated_at,
          studio_project:studio_projects(name),
          business_model_canvas:business_model_canvases(name)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching value maps:', error)
        setError('Error loading value maps')
      } else {
        setValueMaps(data || [])
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

  const columns: AdminTableColumn<ValueMap>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (vm) => (
        <div className="flex flex-col">
          <span className="font-medium">{vm.name}</span>
          <span className="text-sm text-muted-foreground">/{vm.slug}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (vm) => <StatusBadge value={vm.status} />,
    },
    {
      key: 'bmc',
      header: 'Linked BMC',
      cell: (vm) =>
        vm.business_model_canvas?.name ? (
          <Link
            href={`/admin/canvases/business-models/${vm.business_model_canvas_id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            {vm.business_model_canvas.name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (vm) => (
        <span className="text-sm text-muted-foreground">{vm.studio_project?.name || '-'}</span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (vm) => (
        <span className="text-sm text-muted-foreground">{formatDate(vm.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (vm) => (
        <Link
          href={`/admin/canvases/value-maps/${vm.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminListLayout
      title="Value Maps"
      description="What you offer: products/services, pain relievers, gain creators"
      actionHref="/admin/canvases/value-maps/new"
      actionLabel="New Value Map"
    >
      {valueMaps.length > 0 ? (
        <AdminTable columns={columns} data={valueMaps} />
      ) : (
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          }
          title="No value maps yet"
          description="Create your first value map to define what you offer"
          actionHref="/admin/canvases/value-maps/new"
          actionLabel="New Value Map"
        />
      )}
    </AdminListLayout>
  )
}
