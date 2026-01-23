export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { JourneyCanvasView } from './journey-canvas-view'
import type {
  JourneyStage,
  JourneyCell,
  JourneyLayerType,
} from '@/lib/boundary-objects/journey-cells'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JourneyCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch journey
  const { data: journey, error: journeyError } = await supabase
    .from('user_journeys')
    .select('id, slug, name, description, status')
    .eq('id', id)
    .single()

  if (journeyError || !journey) {
    notFound()
  }

  // Fetch stages with ordering
  const { data: stagesData, error: stagesError } = await supabase
    .from('journey_stages')
    .select('id, user_journey_id, name, description, sequence')
    .eq('user_journey_id', id)
    .order('sequence', { ascending: true })

  if (stagesError) {
    console.error('Error fetching stages:', stagesError)
    notFound()
  }

  // Transform stages to match JourneyStage type
  const stages: JourneyStage[] = (stagesData || []).map((s) => ({
    id: s.id,
    user_journey_id: s.user_journey_id,
    name: s.name,
    description: s.description,
    sequence: s.sequence ?? 0,
  }))

  // Fetch cells for all stages
  // Note: journey_cells table may not be in Supabase types yet if migration hasn't been applied
  let cells: JourneyCell[] = []
  if (stages.length > 0) {
    const stageIds = stages.map((s) => s.id)

    // Use type assertion since table may not be in generated types yet
    const { data: cellsData, error: cellsError } = await (supabase
      .from('journey_cells' as any)
      .select('*')
      .in('stage_id', stageIds) as any)

    if (cellsError) {
      // Table may not exist yet - this is OK, we'll show empty cells
      console.log('Note: journey_cells table may not exist yet:', cellsError.message)
    } else if (cellsData) {
      // Transform cells to match JourneyCell type
      cells = (cellsData as any[]).map((c) => ({
        id: c.id,
        stage_id: c.stage_id,
        layer_type: c.layer_type as JourneyLayerType,
        content: c.content,
        emotion_score: c.emotion_score,
        channel_type: c.channel_type,
        sequence: c.sequence ?? 0,
        created_at: c.created_at ?? new Date().toISOString(),
        updated_at: c.updated_at ?? new Date().toISOString(),
      }))
    }
  }

  // Fetch touchpoints for all stages (touchpoints are linked via journey_stage_id)
  interface Touchpoint {
    id: string
    journey_stage_id: string
    name: string
    description: string | null
    sequence: number
    channel_type: string | null
    interaction_type: string | null
    importance: string | null
    current_experience_quality: string | null
    pain_level: string | null
  }

  let touchpoints: Touchpoint[] = []
  if (stages.length > 0) {
    const stageIds = stages.map((s) => s.id)

    const { data: touchpointsData, error: touchpointsError } = await supabase
      .from('touchpoints')
      .select('id, journey_stage_id, name, description, sequence, channel_type, interaction_type, importance, current_experience_quality, pain_level')
      .in('journey_stage_id', stageIds)
      .order('sequence', { ascending: true })

    if (touchpointsError) {
      console.error('Error fetching touchpoints:', touchpointsError.message)
    } else if (touchpointsData) {
      touchpoints = touchpointsData
    }
  }

  return (
    <JourneyCanvasView
      journey={{
        id: journey.id,
        slug: journey.slug,
        name: journey.name,
        description: journey.description,
        status: journey.status,
      }}
      stages={stages}
      cells={cells}
      touchpoints={touchpoints}
    />
  )
}
