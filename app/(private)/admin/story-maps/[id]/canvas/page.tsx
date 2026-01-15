export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { StoryMapCanvasView } from './story-map-canvas-view'
import { ensureDefaultLayers } from '@/lib/boundary-objects/story-map-layers'

interface Params {
  id: string
}

export default async function StoryMapCanvasPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch story map with activities, stories, and layers
  const { data: storyMap, error } = await supabase
    .from('story_maps')
    .select(`
      *,
      studio_projects!studio_project_id (id, name, slug),
      activities (
        *,
        user_stories (*)
      ),
      story_map_layers (*)
    `)
    .eq('id', id)
    .single()

  if (error || !storyMap) {
    notFound()
  }

  // Ensure default layers exist (creates them on first access)
  let layers = storyMap.story_map_layers || []
  if (layers.length === 0) {
    const layersResult = await ensureDefaultLayers(supabase, id)
    if (layersResult.success) {
      layers = layersResult.data
    }
  }

  // Sort layers by sequence
  layers = [...layers].sort((a, b) => a.sequence - b.sequence)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <StoryMapCanvasView storyMap={storyMap as any} layers={layers} />
}
