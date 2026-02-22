export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { JourneyForm } from '@/components/admin/journey-form'

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: journey, error } = await supabase
    .from('user_journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !journey) {
    notFound()
  }

  return <JourneyForm journey={journey as any} />
}
