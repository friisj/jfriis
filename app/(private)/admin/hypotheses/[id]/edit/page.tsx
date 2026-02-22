export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { HypothesisForm } from '@/components/admin/hypothesis-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditHypothesisPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('studio_hypotheses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  return <HypothesisForm hypothesis={data} />
}
