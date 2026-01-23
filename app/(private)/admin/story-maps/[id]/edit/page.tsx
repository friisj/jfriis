export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout, AdminErrorBoundary } from '@/components/admin'
import { StoryMapForm } from '@/components/admin/story-map-form'

interface Params {
  id: string
}

export default async function EditStoryMapPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch story map
  const { data: storyMap, error } = await supabase
    .from('story_maps')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !storyMap) {
    notFound()
  }

  // Fetch projects for the form
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('id, name')
    .order('name')

  return (
    <AdminFormLayout
      title={`Edit: ${storyMap.name}`}
      description="Update story map details"
      backHref={`/admin/story-maps/${id}`}
      backLabel="Back to Story Map"
    >
      <AdminErrorBoundary>
        <StoryMapForm storyMap={storyMap as any} projects={projects || []} />
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
