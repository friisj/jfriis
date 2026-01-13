export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AdminDetailLayout, AdminErrorBoundary } from '@/components/admin'

interface Params {
  id: string
}

export default async function StoryMapDetailPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch story map with activities and stories
  const { data: storyMap, error } = await supabase
    .from('story_maps')
    .select(`
      *,
      studio_projects!studio_project_id (id, name, slug),
      activities (
        *,
        user_stories (*)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !storyMap) {
    notFound()
  }

  const activities = storyMap.activities?.sort((a: any, b: any) => a.sequence - b.sequence) || []
  const totalStories = activities.reduce((sum: number, a: any) => sum + (a.user_stories?.length || 0), 0)

  return (
    <AdminDetailLayout
      title={storyMap.name}
      description={storyMap.description || undefined}
      backHref="/admin/story-maps"
      backLabel="Back to Story Maps"
      actions={
        <div className="flex gap-2">
          <Link
            href={`/admin/story-maps/${id}/edit`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90"
          >
            Edit Story Map
          </Link>
        </div>
      }
    >
      <AdminErrorBoundary>
        <div className="space-y-8">
          {/* Story Map Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoCard label="Type" value={storyMap.map_type} />
            <InfoCard label="Status" value={storyMap.status} />
            <InfoCard label="Validation" value={storyMap.validation_status} />
            <InfoCard label="Activities" value={activities.length.toString()} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoCard label="Total Stories" value={totalStories.toString()} />
            <InfoCard label="Version" value={storyMap.version?.toString() || '1'} />
          </div>

          {storyMap.studio_projects && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Project</h3>
              <Link
                href={`/admin/studio/${storyMap.studio_projects.id}`}
                className="text-primary hover:underline"
              >
                {storyMap.studio_projects.name}
              </Link>
            </div>
          )}

          {/* Activities and Stories */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Activities & Stories</h2>
              <span className="text-sm text-muted-foreground">
                {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}, {totalStories} stor{totalStories !== 1 ? 'ies' : 'y'}
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                <p className="mb-2">No activities defined yet</p>
                <p className="text-sm">
                  Add activities to organize your user stories
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity: any) => {
                  const stories = activity.user_stories?.sort((a: any, b: any) =>
                    (a.vertical_position ?? 999) - (b.vertical_position ?? 999)
                  ) || []

                  return (
                    <div key={activity.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{activity.name}</div>
                          {activity.description && (
                            <div className="text-sm text-muted-foreground">{activity.description}</div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stories.length} stor{stories.length !== 1 ? 'ies' : 'y'}
                        </span>
                      </div>

                      {stories.length > 0 && (
                        <table className="w-full">
                          <thead className="bg-muted/30">
                            <tr className="text-left text-sm">
                              <th className="px-4 py-2 font-medium">Story</th>
                              <th className="px-4 py-2 font-medium">Type</th>
                              <th className="px-4 py-2 font-medium">Priority</th>
                              <th className="px-4 py-2 font-medium">Status</th>
                              <th className="px-4 py-2 font-medium">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stories.map((story: any) => (
                              <tr key={story.id} className="border-t">
                                <td className="px-4 py-2">
                                  <div className="font-medium text-sm">{story.title}</div>
                                  {story.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-1">
                                      {story.description}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-sm capitalize">
                                  {story.story_type || '-'}
                                </td>
                                <td className="px-4 py-2">
                                  <PriorityBadge priority={story.priority} />
                                </td>
                                <td className="px-4 py-2">
                                  <StoryStatusBadge status={story.status} />
                                </td>
                                <td className="px-4 py-2 text-sm">
                                  {story.story_points || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          {storyMap.tags && storyMap.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {storyMap.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-muted rounded text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </AdminErrorBoundary>
    </AdminDetailLayout>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="font-medium capitalize">{value}</div>
    </div>
  )
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return <span className="text-sm text-muted-foreground">-</span>

  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-700',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[priority] || colors.low}`}>
      {priority}
    </span>
  )
}

function StoryStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    backlog: 'bg-gray-100 text-gray-700',
    ready: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    review: 'bg-purple-100 text-purple-700',
    done: 'bg-green-100 text-green-700',
    archived: 'bg-orange-100 text-orange-700',
  }

  const labels: Record<string, string> = {
    backlog: 'Backlog',
    ready: 'Ready',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    archived: 'Archived',
  }

  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.backlog}`}>
      {labels[status] || status}
    </span>
  )
}
