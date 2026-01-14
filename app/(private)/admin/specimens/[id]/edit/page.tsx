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

  // Transform the data for the form
  const initialData = {
    title: specimen.title,
    slug: specimen.slug,
    description: specimen.description || '',
    component_id: specimen.component_code || '',
    type: specimen.type || '',
    published: specimen.published,
    tags: specimen.tags?.join(', ') || '',
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Specimen</h1>
          <p className="text-muted-foreground">
            Update specimen details and configuration
          </p>
        </div>

        <SpecimenForm specimenId={id} initialData={initialData} />
      </div>
    </div>
  )
}
