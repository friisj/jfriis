export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { ValueMapForm } from '@/components/admin/value-map-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditValueMapPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('value_maps') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const valueMap = data

  // Normalize canvas blocks to ensure all required arrays exist
  const normalizeBlock = (block: any) => ({
    items: block?.items || [],
    item_ids: block?.item_ids || [],
    assumptions: block?.assumptions || [],
    assumption_ids: block?.assumption_ids || [],
    validation_status: block?.validation_status || 'untested',
  })

  const initialData = {
    slug: valueMap.slug,
    name: valueMap.name,
    description: valueMap.description || '',
    status: valueMap.status as 'draft' | 'active' | 'validated' | 'archived',
    tags: valueMap.tags?.join(', ') || '',
    studio_project_id: valueMap.studio_project_id || '',
    business_model_canvas_id: valueMap.business_model_canvas_id || '',
    products_services: normalizeBlock(valueMap.products_services),
    pain_relievers: normalizeBlock(valueMap.pain_relievers),
    gain_creators: normalizeBlock(valueMap.gain_creators),
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {valueMap.name}</h1>
          <p className="text-muted-foreground">Update value map</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ValueMapForm valueMapId={id} initialData={initialData as any} />
        </div>
      </div>
    </div>
  )
}
