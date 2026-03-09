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
import { IconUsers } from '@tabler/icons-react'

interface CustomerProfile {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  profile_type: string | null
  validation_confidence: string | null
  studio_project_id: string | null
  created_at: string
  updated_at: string
  studio_project?: { name: string } | null
}

const profileTypeLabels: Record<string, string> = {
  persona: 'Persona',
  segment: 'Segment',
  archetype: 'Archetype',
  icp: 'ICP',
}

export default function AdminCustomerProfilesPage() {
  const [profiles, setProfiles] = useState<CustomerProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('customer_profiles')
        .select(`
          id,
          slug,
          name,
          description,
          status,
          profile_type,
          validation_confidence,
          studio_project_id,
          created_at,
          updated_at,
          studio_project:studio_projects(name)
        `)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error fetching customer profiles:', error)
        setError('Error loading customer profiles')
      } else {
        setProfiles(data || [])
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

  const columns: AdminTableColumn<CustomerProfile>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (profile) => (
        <div className="flex flex-col">
          <span className="font-medium">{profile.name}</span>
          <span className="text-sm text-muted-foreground">/{profile.slug}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      cell: (profile) => (
        <span className="text-sm">
          {profile.profile_type ? profileTypeLabels[profile.profile_type] || profile.profile_type : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (profile) => <StatusBadge value={profile.status} />,
    },
    {
      key: 'confidence',
      header: 'Confidence',
      cell: (profile) => (
        <span className={`text-sm ${
          profile.validation_confidence === 'high' ? 'text-green-600 dark:text-green-400' :
          profile.validation_confidence === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
          profile.validation_confidence === 'low' ? 'text-red-600 dark:text-red-400' :
          'text-muted-foreground'
        }`}>
          {profile.validation_confidence || '-'}
        </span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      cell: (profile) => (
        <span className="text-sm text-muted-foreground">
          {profile.studio_project?.name || '-'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      cell: (profile) => (
        <span className="text-sm text-muted-foreground">{formatDate(profile.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (profile) => (
        <Link
          href={`/admin/canvases/customer-profiles/${profile.id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Edit
        </Link>
      ),
    },
  ]

  return (
    <AdminListLayout
      title="Customer Profiles"
      description="Jobs, pains, and gains analysis"
      actionHref="/admin/canvases/customer-profiles/new"
      actionLabel="New Profile"
    >
      {profiles.length > 0 ? (
        <AdminTable columns={columns} data={profiles} />
      ) : (
        <AdminEmptyState
          icon={
            <IconUsers size={32} className="text-muted-foreground" />
          }
          title="No customer profiles yet"
          description="Create your first profile to understand your customers"
          actionHref="/admin/canvases/customer-profiles/new"
          actionLabel="New Profile"
        />
      )}
    </AdminListLayout>
  )
}
