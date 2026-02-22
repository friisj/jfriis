export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { BlueprintForm } from '@/components/admin/blueprint-form'

interface Params {
  id: string
}

export default async function EditBlueprintPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: blueprint, error } = await supabase
    .from('service_blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !blueprint) {
    notFound()
  }

  return <BlueprintForm blueprint={blueprint as any} />
}
