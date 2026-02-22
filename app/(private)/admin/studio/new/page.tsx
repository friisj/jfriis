import { createClient } from '@/lib/supabase-server'
import { StudioProjectForm } from '@/components/admin/studio-project-form'

export default async function NewStudioProjectPage() {
  const supabase = await createClient()

  // Fetch existing project names for AI context (helps generate unique names)
  const { data: projects } = await supabase
    .from('studio_projects')
    .select('name')
    .order('name')

  const existingProjectNames = projects?.map((p) => p.name) || []

  return (
    <StudioProjectForm mode="create" existingProjectNames={existingProjectNames} />
  )
}
