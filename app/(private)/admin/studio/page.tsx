export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import { AdminListLayout } from '@/components/admin'
import { StudioListView } from '@/components/admin/views/studio-list-view'

export default async function AdminStudioPage() {
  const supabase = await createClient()

  const { data: projects, error } = await supabase
    .from('studio_projects')
    .select(`
      id,
      slug,
      name,
      description,
      status,
      temperature,
      current_focus,
      is_private,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching studio projects:', error)
    return <div className="p-8">Error loading studio projects</div>
  }

  return (
    <AdminListLayout
      title="Studio Projects"
      description="Workshop projects with hypothesis-driven roadmaps"
      actionHref="/admin/studio/new"
      actionLabel="New Project"
    >
      <StudioListView projects={projects || []} />
    </AdminListLayout>
  )
}
