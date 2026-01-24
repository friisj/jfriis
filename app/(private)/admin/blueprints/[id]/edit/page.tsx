import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { AdminErrorBoundary } from '@/components/admin'
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
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back navigation */}
        <Link
          href="/admin/blueprints"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blueprints
        </Link>

        {/* Header with Canvas View link */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Edit: {blueprint.name}</h1>
            <p className="text-muted-foreground">Update service blueprint details</p>
          </div>
          <Link
            href={`/admin/blueprints/${id}/canvas`}
            className="px-4 py-2 border border-primary text-primary rounded-md text-sm hover:bg-primary/10 transition-colors"
          >
            Canvas View
          </Link>
        </div>

        <AdminErrorBoundary>
          <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
            <BlueprintForm blueprint={blueprint as any} projects={projects || []} />
          </Suspense>
        </AdminErrorBoundary>
      </div>
    </div>
  )
}
