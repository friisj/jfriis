export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
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

  const { data: storyMap, error } = await supabase
    .from('story_maps')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !storyMap) {
    notFound()
  }

  return <StoryMapForm storyMap={storyMap as any} />
}
