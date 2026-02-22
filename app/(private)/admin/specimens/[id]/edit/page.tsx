export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { SpecimenForm } from '@/components/admin/specimen-form'
import { notFound } from 'next/navigation'

interface Specimen {
  id: string
  title: string
  slug: string
  description: string | null
  component_code: string | null
  type: string | null
  published: boolean
  tags: string[] | null
}

interface EditSpecimenPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditSpecimenPage({ params }: EditSpecimenPageProps) {
  const supabase = await createClient()
  const { id } = await params

  const { data: specimen, error } = await supabase
    .from('specimens')
    .select('*')
    .eq('id', id)
    .single<Specimen>()

  if (error || !specimen) {
    notFound()
  }

  const initialData = {
    title: specimen.title,
    slug: specimen.slug,
    description: specimen.description || '',
    component_id: specimen.component_code || '',
    type: specimen.type || '',
    published: specimen.published,
    tags: specimen.tags?.join(', ') || '',
  }

  return <SpecimenForm specimenId={id} initialData={initialData} />
}
