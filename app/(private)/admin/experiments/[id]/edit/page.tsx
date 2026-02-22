export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { ExperimentForm } from '@/components/admin/experiment-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditExperimentPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('studio_experiments')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  return <ExperimentForm experiment={data} />
}
