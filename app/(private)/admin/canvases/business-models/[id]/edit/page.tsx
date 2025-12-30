export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { BusinessModelCanvasForm } from '@/components/admin/business-model-canvas-form'
import { notFound } from 'next/navigation'
import type { BusinessModelCanvas } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditBusinessModelCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('business_model_canvases')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const canvas = data as unknown as BusinessModelCanvas

  // Normalize canvas blocks to ensure all required arrays exist
  const normalizeBlock = (block: any) => ({
    item_ids: block?.item_ids || [],
    assumption_ids: block?.assumption_ids || [],
    validation_status: block?.validation_status || 'untested',
  })

  const initialData = {
    slug: canvas.slug,
    name: canvas.name,
    description: canvas.description || '',
    status: canvas.status as 'draft' | 'active' | 'validated' | 'archived',
    tags: canvas.tags?.join(', ') || '',
    studio_project_id: canvas.studio_project_id || '',
    key_partners: normalizeBlock(canvas.key_partners),
    key_activities: normalizeBlock(canvas.key_activities),
    key_resources: normalizeBlock(canvas.key_resources),
    value_propositions: normalizeBlock(canvas.value_propositions),
    customer_segments: normalizeBlock(canvas.customer_segments),
    customer_relationships: normalizeBlock(canvas.customer_relationships),
    channels: normalizeBlock(canvas.channels),
    cost_structure: normalizeBlock(canvas.cost_structure),
    revenue_streams: normalizeBlock(canvas.revenue_streams),
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {canvas.name}</h1>
          <p className="text-muted-foreground">
            Update business model canvas
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <BusinessModelCanvasForm canvasId={id} initialData={initialData as any} />
        </div>
      </div>
    </div>
  )
}
