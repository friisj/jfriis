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
    .from('ventures')
    .select('*')
    .eq('id', id)
    .single<Venture>()

  if (error || !venture) {
    notFound()
  }

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

  return <VentureForm ventureId={id} initialData={initialData} />
}
