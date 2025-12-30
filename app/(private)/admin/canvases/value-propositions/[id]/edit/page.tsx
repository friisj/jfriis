export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { ValuePropositionCanvasForm } from '@/components/admin/value-proposition-canvas-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditValuePropositionCanvasPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await (supabase
    .from('value_proposition_canvases') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    notFound()
  }

  const vpc = data

  const initialData = {
    slug: vpc.slug,
    name: vpc.name,
    description: vpc.description || '',
    status: vpc.status as 'draft' | 'active' | 'validated' | 'archived',
    tags: vpc.tags?.join(', ') || '',
    studio_project_id: vpc.studio_project_id || '',
    value_map_id: vpc.value_map_id || '',
    customer_profile_id: vpc.customer_profile_id || '',
    fit_score: vpc.fit_score ? String(Math.round(vpc.fit_score * 100)) : '',
    fit_analysis: vpc.fit_analysis || {},
    addressed_jobs: vpc.addressed_jobs?.items || [],
    addressed_pains: vpc.addressed_pains?.items || [],
    addressed_gains: vpc.addressed_gains?.items || [],
    validation_status: vpc.validation_status as 'untested' | 'testing' | 'validated' | 'invalidated',
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {vpc.name}</h1>
          <p className="text-muted-foreground">Update value proposition canvas fit analysis</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <ValuePropositionCanvasForm vpcId={id} initialData={initialData} />
        </div>
      </div>
    </div>
  )
}
