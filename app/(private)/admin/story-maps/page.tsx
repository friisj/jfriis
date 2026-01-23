export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { AdminListLayout, AdminErrorBoundary, ErrorState } from '@/components/admin'
import Link from 'next/link'
import type { BoundaryObjectStatus, ValidationStatus, StoryMapType } from '@/lib/types/boundary-objects'

interface SearchParams {
  status?: string
  validation?: string
  type?: string
  search?: string
  project?: string
}

export default async function AdminStoryMapsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query
  let query = supabase
    .from('story_maps')
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
    query = query.eq('map_type', params.type)
  }
  if (params.project) {
    query = query.eq('studio_project_id', params.project)
  }
  if (params.search) {
    // Sanitize search input to prevent SQL injection
    const sanitized = params.search.replace(/[%_\\]/g, '\\$&')
    query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%`)
  }

  const { data: storyMaps, error } = await query

  if (error) {
    console.error('Error fetching story maps:', error)
    return (
      <AdminListLayout
        title="Story Maps"
        description="Plan features and organize user stories"
        actionHref="/admin/story-maps/new"
        actionLabel="New Story Map"
      >
        <ErrorState
          title="Failed to load story maps"
          message={error.message}
        />
      </AdminListLayout>
    )
  }

  return (
    <AdminListLayout
      title="Story Maps"
      description="Plan features and organize user stories"
      actionHref="/admin/story-maps/new"
      actionLabel="New Story Map"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
          <StoryMapsTable storyMaps={storyMaps || []} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminListLayout>
  )
}

function StoryMapsTable({ storyMaps }: { storyMaps: any[] }) {
  if (storyMaps.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="mb-4">No story maps yet</p>
        <Link
          href="/admin/story-maps/new"
          className="text-primary hover:underline"
        >
          Create your first story map
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
          {storyMaps.map((storyMap) => (
            <tr key={storyMap.id} className="border-b">
              <td className="py-3">
                <Link
                  href={`/admin/story-maps/${storyMap.id}`}
                  className="font-medium hover:text-primary"
                >
                  {storyMap.name}
                </Link>
                {storyMap.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {storyMap.description}
                  </p>
                )}
              </td>
              <td className="py-3">
                <span className="text-sm capitalize">{storyMap.map_type}</span>
              </td>
              <td className="py-3">
                <StatusBadge status={storyMap.status || 'draft'} />
              </td>
              <td className="py-3">
                {storyMap.studio_projects ? (
                  <Link
                    href={`/admin/studio/${storyMap.studio_projects.id}`}
                    className="text-sm hover:text-primary"
                  >
                    {storyMap.studio_projects.name}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 text-sm text-muted-foreground">
                {new Date(storyMap.updated_at).toLocaleDateString()}
              </td>
              <td className="py-3">
                <Link
                  href={`/admin/story-maps/${storyMap.id}/edit`}
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
