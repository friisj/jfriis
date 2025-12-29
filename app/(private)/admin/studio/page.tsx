export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

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
  paused: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  completed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  archived: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
}

const temperatureEmoji = {
  hot: '🔥',
  warm: '🌡️',
  cold: '❄️',
}

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
      scaffolded_at,
      created_at,
      updated_at
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching studio projects:', error)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Studio Projects</h1>
            <p className="text-muted-foreground">
              Workshop projects with hypothesis-driven roadmaps
            </p>
          </div>
          <Link
            href="/admin/studio/new"
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
                    <th className="text-left px-6 py-3 text-sm font-medium">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Temp</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Focus</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Scaffolded</th>
                    <th className="text-left px-6 py-3 text-sm font-medium">Updated</th>
                    <th className="text-right px-6 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {projects.map((project) => (
                    <tr key={project.id} className="hover:bg-accent transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{project.name}</span>
                          <span className="text-sm text-muted-foreground">/{project.slug}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[project.status as keyof typeof statusColors] || statusColors.draft}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {project.temperature ? (
                          <span title={project.temperature}>
                            {temperatureEmoji[project.temperature as keyof typeof temperatureEmoji]}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted-foreground line-clamp-1 max-w-xs">
                          {project.current_focus || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {project.scaffolded_at ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
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
                      <td className="px-6 py-4 text-right space-x-2">
                        <Link
                          href={`/admin/studio/${project.id}/edit`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
                        >
                          Edit
                        </Link>
                        {project.scaffolded_at && (
                          <Link
                            href={`/studio/${project.slug}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
                          >
                            View
                          </Link>
                        )}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">No studio projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Capture your first idea to start building
              </p>
              <Link
                href="/admin/studio/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
