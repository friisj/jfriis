export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AssumptionForm } from '@/components/admin/assumption-form'

interface EditAssumptionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAssumptionPage({ params }: EditAssumptionPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: assumption, error } = await supabase
    .from('assumptions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !assumption) {
    notFound()
  }

  return <AssumptionForm assumption={assumption} />
}
