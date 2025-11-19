import { createClient } from '@/lib/supabase-server'
import { ProjectForm } from '@/components/admin/project-form'
import { notFound } from 'next/navigation'

interface EditProjectPageProps {
  params: {
    id: string
  }
}

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Transform the data for the form
  const initialData = {
    title: project.title,
    slug: project.slug,
    description: project.description || '',
    content: project.content?.markdown || '',
    status: project.status,
    type: project.type || '',
    start_date: project.start_date || '',
    end_date: project.end_date || '',
    published: project.published,
    tags: project.tags?.join(', ') || '',
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Project</h1>
          <p className="text-muted-foreground">
            Update project details and content
          </p>
        </div>

        <ProjectForm projectId={params.id} initialData={initialData} />
      </div>
    </div>
  )
}
