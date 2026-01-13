import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { AdminFormLayout, AdminErrorBoundary } from '@/components/admin'
import { BlueprintForm } from '@/components/admin/blueprint-form'

export default async function NewBlueprintPage() {
  const supabase = await createClient()

  // Fetch projects for relationship field
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('id, name')
    .order('name')

  return (
    <AdminFormLayout
      title="Create Service Blueprint"
      description="Design service delivery flows and support processes"
      backHref="/admin/blueprints"
      backLabel="Back to Blueprints"
    >
      <AdminErrorBoundary>
        <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
          <BlueprintForm projects={projects || []} />
        </Suspense>
      </AdminErrorBoundary>
    </AdminFormLayout>
  )
}
