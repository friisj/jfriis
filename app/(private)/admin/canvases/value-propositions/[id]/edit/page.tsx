export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { ValuePropositionCanvasForm } from '@/components/admin/value-proposition-canvas-form'
import { notFound } from 'next/navigation'
import type { ValuePropositionCanvas } from '@/lib/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditValuePropositionCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('value_proposition_canvases')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const canvas = data as unknown as ValuePropositionCanvas

  const initialData = {
    slug: canvas.slug,
    name: canvas.name,
    description: canvas.description || '',
    status: canvas.status as 'draft' | 'active' | 'validated' | 'archived',
    tags: canvas.tags?.join(', ') || '',
    fit_score: canvas.fit_score?.toString() || '',
    studio_project_id: canvas.studio_project_id || '',
    customer_profile_id: canvas.customer_profile_id || '',
    business_model_canvas_id: canvas.business_model_canvas_id || '',
    customer_jobs: canvas.customer_jobs,
    pains: canvas.pains,
    gains: canvas.gains,
    products_services: canvas.products_services,
    pain_relievers: canvas.pain_relievers,
    gain_creators: canvas.gain_creators,
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {canvas.name}</h1>
          <p className="text-muted-foreground">Update value proposition canvas</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ValuePropositionCanvasForm canvasId={id} initialData={initialData as any} />
        </div>
      </div>
    </div>
  )
}
