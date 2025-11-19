import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  slug: string
  status: string
  type: string | null
  published: boolean
  created_at: string
  updated_at: string
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const statusColors = {
  draft: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
  active: 'bg-green-500/10 text-green-700 dark:text-green-400',
  archived: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  completed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
}

export default async function AdminProjectsPage() {
  const supabase = await createClient()

  // Check auth status
  const { data: { user } } = await supabase.auth.getUser()
  console.log('Projects page - User:', user?.email)

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, slug, status, type, published, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
  }

  console.log('Projects fetched:', projects?.length || 0)

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground">
              Manage portfolio projects and businesses
            </p>
          </div>
          <Link
            href="/admin/projects/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        </div>

        {projects && projects.length > 0 ? (
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Published</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Updated</th>
                    <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((project: Project) => (
                    <tr key={project.id} className="hover:bg-accent transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-sm text-muted-foreground">/{project.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status as keyof typeof statusColors] || statusColors.draft}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{project.type || '-'}</td>
                      <td className="px-6 py-4">
                        {project.published ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(project.updated_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/projects/${project.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Get started by creating your first portfolio project
              </p>
              <Link
                href="/admin/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
