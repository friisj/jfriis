export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { StudioProjectForm } from '@/components/admin/studio-project-form'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditStudioProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('studio_projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Fetch hypotheses and experiments
  const { data: hypotheses } = await supabase
    .from('studio_hypotheses')
    .select('id, statement, rationale, validation_criteria, status, sequence')
    .eq('project_id', id)
    .order('sequence')

  const { data: experiments } = await supabase
    .from('studio_experiments')
    .select('id, name, description, type, status, expected_outcome')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch other project names for AI context
  const { data: otherProjects } = await supabase
    .from('studio_projects')
    .select('name')
    .neq('id', id)
    .order('name')

  const existingProjectNames = otherProjects?.map((p) => p.name) || []

  return (
    <StudioProjectForm
      project={project as any}
      mode="edit"
      existingProjectNames={existingProjectNames}
      hypotheses={hypotheses || []}
      experiments={experiments || []}
    />
  )
}
