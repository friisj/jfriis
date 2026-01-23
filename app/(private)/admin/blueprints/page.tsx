export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { AdminListLayout, AdminErrorBoundary, ErrorState } from '@/components/admin'
import Link from 'next/link'
import type { BoundaryObjectStatus, ValidationStatus, BlueprintType } from '@/lib/types/boundary-objects'

interface SearchParams {
  status?: string
  validation?: string
  type?: string
  search?: string
  project?: string
}

export default async function AdminBlueprintsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('service_blueprints')
    .select(`
      *,
      studio_projects!studio_project_id (id, name, slug)
    `)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Apply filters
  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.validation) {
    query = query.eq('validation_status', params.validation)
  }
  if (params.type) {
    query = query.eq('blueprint_type', params.type)
  }
  if (params.project) {
    query = query.eq('studio_project_id', params.project)
  }
  if (params.search) {
    // Sanitize search input to prevent SQL injection
    const sanitized = params.search.replace(/[%_\\]/g, '\\$&')
    query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
  }

  const { data: blueprints, error } = await query

  if (error) {
    console.error('Error fetching blueprints:', error)
    return (
      <AdminListLayout
        title="Service Blueprints"
        description="Design service delivery flows and support processes"
        actionHref="/admin/blueprints/new"
        actionLabel="New Blueprint"
      >
        <ErrorState
          title="Failed to load blueprints"
          message={error.message}
        />
      </AdminListLayout>
    )
  }

  return (
    <AdminListLayout
      title="Service Blueprints"
      description="Design service delivery flows and support processes"
      actionHref="/admin/blueprints/new"
      actionLabel="New Blueprint"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
          <BlueprintsTable blueprints={blueprints || []} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminListLayout>
  )
}

function BlueprintsTable({ blueprints }: { blueprints: any[] }) {
  if (blueprints.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-4">No blueprints yet</p>
        <Link
          href="/admin/blueprints/new"
          className="text-primary hover:underline"
        >
          Create your first blueprint
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">Name</th>
            <th className="pb-3 font-medium">Type</th>
            <th className="pb-3 font-medium">Status</th>
            <th className="pb-3 font-medium">Project</th>
            <th className="pb-3 font-medium">Updated</th>
            <th className="pb-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {blueprints.map((blueprint) => (
            <tr key={blueprint.id} className="border-b">
              <td className="py-3">
                <Link
                  href={`/admin/blueprints/${blueprint.id}`}
                  className="font-medium hover:text-primary"
                >
                  {blueprint.name}
                </Link>
                {blueprint.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {blueprint.description}
                  </p>
                )}
              </td>
              <td className="py-3">
                <span className="text-sm capitalize">{blueprint.blueprint_type}</span>
              </td>
              <td className="py-3">
                <StatusBadge status={blueprint.status || 'draft'} />
              </td>
              <td className="py-3">
                {blueprint.studio_projects ? (
                  <Link
                    href={`/admin/studio/${blueprint.studio_projects.id}`}
                    className="text-sm hover:text-primary"
                  >
                    {blueprint.studio_projects.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {new Date(blueprint.updated_at).toLocaleDateString()}
              </td>
              <td className="py-3">
                <Link
                  href={`/admin/blueprints/${blueprint.id}/edit`}
                  className="text-sm text-primary hover:underline"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-700',
    validated: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.draft}`}>
      {status}
    </span>
  )
}
