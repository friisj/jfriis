export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import { CustomerProfileCanvasView } from './customer-profile-canvas-view'
import type { CustomerProfileCanvas } from '@/lib/boundary-objects/customer-profile-canvas'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CustomerProfileCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Cast to our canvas type
  const profile = data as unknown as CustomerProfileCanvas

  return <CustomerProfileCanvasView profile={profile} />
}
