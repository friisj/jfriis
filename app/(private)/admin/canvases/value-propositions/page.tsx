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
import { IconShieldCheck } from '@tabler/icons-react'

interface VPC {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  fit_score: number | null
  validation_status: string
  studio_project_id: string | null
  value_map_id: string
  customer_profile_id: string
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
  value_map?: { name: string } | null
  customer_profile?: { name: string } | null
}

export default function AdminValuePropositionCanvasesPage() {
  const [vpcs, setVpcs] = useState<VPC[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await (supabase
        .from('value_proposition_canvases') as any)
        .select(`
          id,
          slug,
          name,
          description,
          status,
          fit_score,
          validation_status,
          studio_project_id,
          value_map_id,
          customer_profile_id,
          created_at,
          updated_at,
          studio_project:studio_projects(name),
          value_map:value_maps(name),
          customer_profile:customer_profiles(name)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching VPCs:', error)
        setError('Error loading value proposition canvases')
      } else {
        setVpcs(data || [])
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

  const columns: AdminTableColumn<VPC>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (vpc) => (
        <div className="flex flex-col">
          <span className="font-medium">{vpc.name}</span>
          <span className="text-sm text-muted-foreground">/{vpc.slug}</span>
        </div>
      ),
    },
    {
      key: 'fit',
      header: 'Fit Score',
      align: 'center',
      cell: (vpc) =>
        vpc.fit_score !== null ? (
          <span
            className={`text-sm font-medium ${
              vpc.fit_score >= 0.7
                ? 'text-green-600 dark:text-green-400'
                : vpc.fit_score >= 0.4
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
            }`}
          >
            {Math.round(vpc.fit_score * 100)}%
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (vpc) => <StatusBadge value={vpc.status} />,
    },
    {
      key: 'valueMap',
      header: 'Value Map',
      cell: (vpc) =>
        vpc.value_map?.name ? (
          <Link
            href={`/admin/canvases/value-maps/${vpc.value_map_id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            {vpc.value_map.name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'profile',
      header: 'Customer',
      cell: (vpc) =>
        vpc.customer_profile?.name ? (
          <Link
            href={`/admin/canvases/customer-profiles/${vpc.customer_profile_id}/edit`}
            className="text-sm text-primary hover:underline"
          >
            {vpc.customer_profile.name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (vpc) => (
        <span className="text-sm text-muted-foreground">{formatDate(vpc.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (vpc) => (
        <Link
          href={`/admin/canvases/value-propositions/${vpc.id}/edit`}
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
      description="Product-market fit analysis: linking value maps to customer profiles"
      actionHref="/admin/canvases/value-propositions/new"
      actionLabel="New VPC"
    >
      {vpcs.length > 0 ? (
        <AdminTable columns={columns} data={vpcs} />
      ) : (
        <AdminEmptyState
          icon={
            <IconShieldCheck size={32} className="text-muted-foreground" />
          }
          title="No value proposition canvases yet"
          description="Create a VPC to analyze fit between value maps and customer profiles"
          actionHref="/admin/canvases/value-propositions/new"
          actionLabel="New VPC"
        />
      )}
    </AdminListLayout>
  )
}
