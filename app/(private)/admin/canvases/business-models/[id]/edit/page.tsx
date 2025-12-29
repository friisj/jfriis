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

  const initialData = {
    slug: canvas.slug,
    name: canvas.name,
    description: canvas.description || '',
    status: canvas.status as 'draft' | 'active' | 'validated' | 'archived',
    tags: canvas.tags?.join(', ') || '',
    studio_project_id: canvas.studio_project_id || '',
    key_partners: canvas.key_partners,
    key_activities: canvas.key_activities,
    key_resources: canvas.key_resources,
    value_propositions: canvas.value_propositions,
    customer_segments: canvas.customer_segments,
    customer_relationships: canvas.customer_relationships,
    channels: canvas.channels,
    cost_structure: canvas.cost_structure,
    revenue_streams: canvas.revenue_streams,
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
