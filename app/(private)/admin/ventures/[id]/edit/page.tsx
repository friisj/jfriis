export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { VentureForm } from '@/components/admin/venture-form'
import { notFound } from 'next/navigation'
import type { Venture } from '@/lib/types/database'

interface EditVenturePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditVenturePage({ params }: EditVenturePageProps) {
  const supabase = await createClient()
  const { id } = await params

  const { data: venture, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single<Venture>()

  if (error || !venture) {
    notFound()
  }

  // Transform the data for the form
  const initialData = {
    title: venture.title,
    slug: venture.slug,
    description: venture.description || '',
    content: venture.content?.markdown || '',
    status: venture.status,
    type: venture.type || '',
    start_date: venture.start_date || '',
    end_date: venture.end_date || '',
    published: venture.published,
    tags: venture.tags?.join(', ') || '',
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Venture</h1>
          <p className="text-muted-foreground">
            Update venture details and content
          </p>
        </div>

        <VentureForm ventureId={id} initialData={initialData} />
      </div>
    </div>
  )
}
