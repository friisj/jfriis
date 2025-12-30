export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { ProjectsListView } from '@/components/admin/views/projects-list-view'

export default async function AdminProjectsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  console.log('Projects page - User:', user?.email)

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      slug,
      status,
      type,
      published,
      created_at,
      updated_at,
      project_specimens (count),
      log_entry_projects (count)
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return <div className="p-8">Error loading projects</div>
  }

  console.log('Projects fetched:', projects?.length || 0)

  return (
    <AdminListLayout
      title="Projects"
      description="Manage portfolio projects and businesses"
      actionHref="/admin/projects/new"
      actionLabel="New Project"
    >
      <ProjectsListView projects={projects || []} />
    </AdminListLayout>
  )
}
