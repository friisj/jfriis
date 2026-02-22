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

  // Normalize canvas blocks to ensure all required arrays exist
  const normalizeBlock = (block: any) => ({
    item_ids: block?.item_ids || [],
    assumption_ids: block?.assumption_ids || [],
    validation_status: block?.validation_status || 'untested',
  })

  const valueMap = {
    ...data,
    products_services: normalizeBlock(data.products_services),
    pain_relievers: normalizeBlock(data.pain_relievers),
    gain_creators: normalizeBlock(data.gain_creators),
  }

  return <ValueMapForm valueMap={valueMap as any} />
}
