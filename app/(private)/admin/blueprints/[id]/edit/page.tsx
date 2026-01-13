import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout, AdminErrorBoundary } from '@/components/admin'
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

  // Fetch blueprint
  const { data: blueprint, error } = await supabase
    .from('service_blueprints')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !blueprint) {
    notFound()
  }

  // Fetch projects for relationship field
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('id, name')
    .order('name')

  return (
    <AdminFormLayout
      title={`Edit: ${blueprint.name}`}
      description="Update service blueprint details"
      backHref="/admin/blueprints"
      backLabel="Back to Blueprints"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
          <BlueprintForm blueprint={blueprint} projects={projects || []} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
