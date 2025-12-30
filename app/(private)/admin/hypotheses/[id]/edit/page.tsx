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

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Hypothesis</h1>
          <p className="text-muted-foreground">
            Update hypothesis details
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <HypothesisForm hypothesis={data} mode="edit" />
        </div>
      </div>
    </div>
  )
}
