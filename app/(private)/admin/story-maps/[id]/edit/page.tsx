export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AdminErrorBoundary } from '@/components/admin'
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
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <Link
          href={`/admin/story-maps/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Story Map
        </Link>

        {/* Header with Canvas View link */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit: {storyMap.name}</h1>
            <p className="text-muted-foreground">Update story map details</p>
          </div>
          <Link
            href={`/admin/story-maps/${id}/canvas`}
            className="px-4 py-2 border border-primary text-primary rounded-md text-sm hover:bg-primary/10 transition-colors"
          >
            Canvas View
          </Link>
        </div>

        <AdminErrorBoundary>
          <StoryMapForm storyMap={storyMap as any} projects={projects || []} />
        </AdminErrorBoundary>
      </div>
    </div>
  )
}
