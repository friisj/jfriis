import { createClient } from '@/lib/supabase-server'
import { SpecimenForm } from '@/components/admin/specimen-form'
import { notFound } from 'next/navigation'

interface EditSpecimenPageProps {
  params: {
    id: string
  }
}

export default async function EditSpecimenPage({ params }: EditSpecimenPageProps) {
  const supabase = await createClient()

  const { data: specimen, error } = await supabase
    .from('specimens')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !specimen) {
    notFound()
  }

  // Transform the data for the form
  const initialData = {
    title: specimen.title,
    slug: specimen.slug,
    description: specimen.description || '',
    component_id: specimen.component_code || '', // component_code stores the component ID
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
            Update component code and settings
          </p>
        </div>

        <SpecimenForm specimenId={params.id} initialData={initialData} />
      </div>
    </div>
  )
}
