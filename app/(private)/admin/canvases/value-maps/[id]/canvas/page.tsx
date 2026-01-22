export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { ValueMapCanvasView } from './value-map-canvas-view'
import type { ValueMapCanvas } from '@/lib/boundary-objects/value-map-canvas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ValueMapCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('value_maps')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Cast to our canvas type
  const valueMap = data as unknown as ValueMapCanvas

  return <ValueMapCanvasView valueMap={valueMap} />
}
