export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { StudioProjectForm } from '@/components/admin/studio-project-form'
import { StudioProjectSidebar } from '@/components/admin/studio-project-sidebar'
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

  // Fetch hypotheses and experiments for sidebar
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

  // Fetch other project names for AI context (helps generate unique names)
  const { data: otherProjects } = await supabase
    .from('studio_projects')
    .select('name')
    .neq('id', id) // Exclude current project
    .order('name')

  const existingProjectNames = otherProjects?.map((p) => p.name) || []

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit: {project.name}</h1>
          <p className="text-muted-foreground">
            Update project details and PRD
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card p-6">
              <StudioProjectForm project={project} mode="edit" existingProjectNames={existingProjectNames} />
            </div>
          </div>

          {/* Sidebar */}
          <StudioProjectSidebar
            project={{
              id: project.id,
              slug: project.slug,
              name: project.name,
              description: project.description,
              problem_statement: project.problem_statement,
              success_criteria: project.success_criteria,
              current_focus: project.current_focus,
            }}
            hypotheses={hypotheses || []}
            experiments={experiments || []}
          />
        </div>
      </div>
    </div>
  )
}
