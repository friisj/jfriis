export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BMCCanvasView } from './bmc-canvas-view'
import type { BMCCanvas, BMCBlock } from '@/lib/boundary-objects/bmc-canvas'
import { normalizeBlock } from '@/lib/boundary-objects/bmc-canvas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BMCCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch canvas
  const { data: canvas, error: canvasError } = await supabase
    .from('business_model_canvases')
    .select('*')
    .eq('id', id)
    .single()

  if (canvasError || !canvas) {
    notFound()
  }

  // Transform to BMCCanvas type with normalized blocks
  const bmcCanvas: BMCCanvas = {
    id: canvas.id,
    slug: canvas.slug,
    name: canvas.name,
    description: canvas.description,
    status: canvas.status,
    key_partners: normalizeBlock(canvas.key_partners),
    key_activities: normalizeBlock(canvas.key_activities),
    key_resources: normalizeBlock(canvas.key_resources),
    value_propositions: normalizeBlock(canvas.value_propositions),
    customer_relationships: normalizeBlock(canvas.customer_relationships),
    channels: normalizeBlock(canvas.channels),
    customer_segments: normalizeBlock(canvas.customer_segments),
    cost_structure: normalizeBlock(canvas.cost_structure),
    revenue_streams: normalizeBlock(canvas.revenue_streams),
    created_at: canvas.created_at,
    updated_at: canvas.updated_at,
  }

  return <BMCCanvasView canvas={bmcCanvas} />
}
