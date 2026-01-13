export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout, AdminErrorBoundary } from '@/components/admin'
import { StoryMapForm } from '@/components/admin/story-map-form'

export default async function NewStoryMapPage() {
  const supabase = await createClient()

  // Fetch projects for the form
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('id, name')
    .order('name')

  return (
    <AdminFormLayout
      title="New Story Map"
      description="Create a story map to plan features and organize user stories"
      backHref="/admin/story-maps"
      backLabel="Back to Story Maps"
    >
      <AdminErrorBoundary>
        <StoryMapForm projects={projects || []} />
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
