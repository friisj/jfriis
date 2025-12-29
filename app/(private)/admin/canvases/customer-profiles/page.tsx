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

export default async function AdminCustomerProfilesPage() {
  const supabase = await createClient()

  const { data: profiles, error } = await supabase
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
    return <div className="p-8">Error loading customer profiles</div>
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
      {profiles && profiles.length > 0 ? (
        <AdminTable columns={columns} data={profiles} />
      ) : (
        <AdminEmptyState
          icon={
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
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
